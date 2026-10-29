# Bureau prompt for bash (3.2 and later; the command time needs 4.4).
# CONTROL theme for VS Code - https://github.com/Normalxxnavi/bureau-theme
#
# The extension copies this file to its data folder and loads it from the Bureau
# terminal profile (or from your ~/.bashrc, if you install the prompt outside
# VS Code). Before each prompt it reads prompt.conf, next to it, so the changes
# you make in VS Code apply at once. With style=off it gives your prompt back.
# (bash cannot redraw a prompt that is already on screen: no Classified here.)
# The header and closing line of each command need bash 4.4 (PS0).

[ -n "${BASH_VERSION:-}" ] || return 0
case $- in *i*) ;; *) return 0 ;; esac

if [ -z "${__bureau_loaded:-}" ]; then
__bureau_loaded=1
__bureau_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
__bureau_original_ps1=$PS1
__bureau_ok=1 __bureau_code=0 __bureau_fails=0 __bureau_stopped=0 __bureau_dur=0 __bureau_hc=0
case ${OSTYPE:-} in
  msys* | cygwin* | win32*) __bureau_os=windows ;;
  darwin*) __bureau_os=macos ;;
  *) __bureau_os=linux ;;
esac
shopt -s checkwinsize 2>/dev/null

# Icons of the Bureau Prompt Icons font (U+E1B0-U+E1BF, UTF-8 bytes).
__bureau_g_controlPoints=$'\xee\x86\xb0' __bureau_g_house=$'\xee\x86\xb1'
__bureau_g_command=$'\xee\x86\xb2' __bureau_g_apple=$'\xee\x86\xb3'
__bureau_g_tux=$'\xee\x86\xb4' __bureau_g_tuxMop=$'\xee\x86\xb5'
__bureau_g_folder=$'\xee\x86\xb6' __bureau_g_branch=$'\xee\x86\xb7'
__bureau_g_time=$'\xee\x86\xb8' __bureau_g_error=$'\xee\x86\xb9'
__bureau_g_clear=$'\xee\x86\xba' __bureau_g_anomaly=$'\xee\x86\xbb'
__bureau_g_alert=$'\xee\x86\xbc' __bureau_g_incursion=$'\xee\x86\xbd'
__bureau_g_board=$'\xee\x86\xbe' __bureau_g_classified=$'\xee\x86\xbf'

# prompt.conf: one key per line, letters only (it is never evaluated).
__bureau_conf() {
  __bc_style='' __bc_icons=1 __bc_windows=controlPoints __bc_macos=command __bc_linux=tux __bc_frame=1 __bc_theme=other __bc_lang=en
  local k v
  [ -r "$__bureau_dir/prompt.conf" ] || return 0
  while IFS='=' read -r k v || [ -n "$k" ]; do
    v=${v%$'\r'}
    case $k in
      style) __bc_style=$v ;;
      icons) __bc_icons=$v ;;
      windows) __bc_windows=$v ;;
      macos) __bc_macos=$v ;;
      linux) __bc_linux=$v ;;
      frame) __bc_frame=$v ;;
      theme) __bc_theme=$v ;;
      lang) __bc_lang=$v ;;
    esac
  done < "$__bureau_dir/prompt.conf"
}

# Git: branch, commits ahead/behind and changed files. Only inside a repository
# (no git process in other folders). Without core.fsmonitor: in a repository
# you did not create (an archive you extracted), its .git/config could name a
# program that git status would run on every prompt.
__bureau_git() {
  __bg_branch='' __bg_counts=''
  local dir=$PWD line oid='' ahead=0 behind=0 changes=0
  while [ ! -e "$dir/.git" ]; do
    # Up to the root: also C:/… (no / left), where ${dir%/*} would not change it.
    case $dir in */*) dir=${dir%/*} ;; *) return 1 ;; esac
  done
  command -v git >/dev/null 2>&1 || return 1
  while IFS= read -r line; do
    case $line in
      '# branch.head '*) __bg_branch=${line#'# branch.head '} ;;
      '# branch.oid '*) oid=${line#'# branch.oid '} ;;
      '# branch.ab '*)
        line=${line#'# branch.ab +'}
        ahead=${line%% *}
        behind=${line##*-}
        ;;
      '#'*) ;;
      *) changes=$((changes + 1)) ;;
    esac
  done < <(command git -c core.fsmonitor= --no-optional-locks status --porcelain=v2 --branch 2>/dev/null)
  [ "$__bg_branch" = '(detached)' ] && __bg_branch=${oid:0:7}
  [ "$ahead" != 0 ] && __bg_counts="↑$ahead"
  [ "$behind" != 0 ] && __bg_counts="${__bg_counts:+$__bg_counts }↓$behind"
  [ "$changes" != 0 ] && __bg_counts="${__bg_counts:+$__bg_counts }~$changes"
  [ -n "$__bg_branch" ]
}

# Adds text with an SGR colour ($1, '' = none) to the prompt being built.
# \001 and \002 tell readline that the escape sequences take no room.
__bureau_add() {
  if [ -n "$1" ]; then
    __bp+=$'\001\033['"$1"$'m\002'"$2"$'\001\033[0m\002'
  else
    __bp+=$2
  fi
  __bt+=$2
}

__bureau_upper() {
  if [ "${BASH_VERSINFO[0]}" -ge 4 ]; then __bu=${1^^}; else __bu=$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]'); fi
}

__bureau_duration() {
  local ms=$1 t
  if [ "$ms" -lt 10000 ]; then
    t=$((ms / 100))
    [ "${#t}" -lt 2 ] && t=0$t
    t="${t%?}.${t: -1}"
    [ "$__bc_lang" = es ] && t=${t/./,}
    __bd="$t s"
  elif [ "$ms" -lt 60000 ]; then
    __bd="$((ms / 1000)) s"
  else
    __bd="$((ms / 60000)) min $((ms / 1000 % 60)) s"
  fi
}

# Builds the prompt in __bureau_ps1 from the state and prompt.conf. Separate
# from the hook so that it can be tested with made-up data.
__bureau_render() {
  local A=31 L=31 icons=0 os='' git='' dur='' mark
  [ "$__bc_theme" = resonant ] && A=36 L=36
  [ "$__bc_theme" = black ] && L=97
  [ "$__bc_icons" != 0 ] && icons=1
  local path=$PWD leaf
  case $PWD in
    "$HOME") path='~' ;;
    "$HOME"/*) path="~${PWD#"$HOME"}" ;;
  esac
  leaf=${path##*/}
  [ -z "$leaf" ] && leaf=$path
  if [ "$icons" = 1 ]; then
    case $__bureau_os in
      windows) os=$__bc_windows ;;
      macos) os=$__bc_macos ;;
      *) os=$__bc_linux ;;
    esac
    case $os in controlPoints | house | command | apple | tux | tuxMop) ;; *) os=controlPoints ;; esac
    eval "os=\$__bureau_g_$os"
    # Every icon carries the space behind it: the drawing fills both cells, centred.
    os+=' '
  else
    os=FBC
  fi
  local ifold='' ibranch='' itime='' ierr='× '
  if [ "$icons" = 1 ]; then
    ifold="$__bureau_g_folder " ibranch="$__bureau_g_branch " itime="$__bureau_g_time " ierr="$__bureau_g_error "
  fi
  if __bureau_git; then git=$__bg_branch${__bg_counts:+ $__bg_counts}; fi
  if [ "${__bureau_dur:-0}" -ge 2000 ]; then __bureau_duration "$__bureau_dur"; dur=$__bd; fi
  mark=$L
  [ "$__bureau_ok" = 1 ] || mark=91
  __bp='' __bt=''

  case $__bc_style in
    signage)
      __bureau_add "7;$A" " $os "; __bureau_add '' ' '
      __bureau_add 7 " $ifold$path "
      [ -n "$git" ] && { __bureau_add '' ' '; __bureau_add '7;33' " $ibranch$git "; }
      [ -n "$dur" ] && { __bureau_add '' ' '; __bureau_add '7;34' " $itime$dur "; }
      [ "$__bureau_ok" = 1 ] || { __bureau_add '' ' '; __bureau_add '7;91' " $ierr$__bureau_code "; }
      __bureau_add '' ' '; __bureau_add "$mark" '›'; __bureau_add '' ' '
      ;;
    dossier)
      __bureau_add 90 '┌─['; __bureau_add "$A" "$os"; __bureau_add 90 ']─['
      __bureau_add '' "$ifold$path"; __bureau_add 90 ']'
      [ -n "$git" ] && { __bureau_add 90 '─['; __bureau_add 33 "$ibranch$git"; __bureau_add 90 ']'; }
      [ -n "$dur" ] && { __bureau_add 90 '─['; __bureau_add 34 "$itime$dur"; __bureau_add 90 ']'; }
      [ "$__bureau_ok" = 1 ] || { __bureau_add 90 '─['; __bureau_add 91 "$ierr$__bureau_code"; __bureau_add 90 ']'; }
      __bureau_add '' $'\n'; __bureau_add 90 '└─'; __bureau_add "$mark" '■'; __bureau_add '' ' '
      ;;
    controlPoint)
      if [ "$__bureau_ok" = 1 ]; then __bureau_add "$L" '■'; else __bureau_add 91 '□'; fi
      [ "$icons" = 1 ] && { __bureau_add '' ' '; __bureau_add 90 "$__bureau_g_folder"; }
      __bureau_add '' ' '; __bureau_add 1 "$leaf"
      [ -n "$git" ] && { __bureau_add '' ' '; __bureau_add 33 "$ibranch$git"; }
      [ -n "$dur" ] && { __bureau_add '' ' '; __bureau_add 34 "$itime$dur"; }
      __bureau_add '' ' '
      if [ "$__bureau_ok" = 1 ]; then __bureau_add "$L" '›'; else __bureau_add 91 "$ierr$__bureau_code ›"; fi
      __bureau_add '' ' '
      ;;
    board)
      [ "$icons" = 1 ] && { __bureau_add "$L" "$__bureau_g_board"; __bureau_add '' ' '; }
      __bureau_upper "$leaf"
      __bureau_add "$L" '<<'; __bureau_add 1 "$__bu"; __bureau_add "$L" '>>'
      if [ -n "$git" ]; then
        __bureau_upper "$__bg_branch"
        __bureau_add '' ' '; __bureau_add 33 "$ibranch($__bu.)"
        [ -n "$__bg_counts" ] && { __bureau_add '' ' '; __bureau_add 90 "($__bg_counts.)"; }
      fi
      [ -n "$dur" ] && { __bureau_upper "$dur"; __bureau_add '' ' '; __bureau_add 34 "$itime($__bu.)"; }
      [ "$__bureau_ok" = 1 ] || { __bureau_add '' ' '; __bureau_add 91 "$ierr(ERROR $__bureau_code.) ($__bureau_code.)"; }
      __bureau_add '' ' '; __bureau_add "$mark" '›'; __bureau_add '' ' '
      ;;
    alertLevel)
      local left right lt rt lc li ln fill line=''
      [ "$icons" = 1 ] && { __bureau_add 90 "$__bureau_g_folder"; __bureau_add '' ' '; }
      __bureau_add 1 "$path"
      [ -n "$git" ] && { __bureau_add '' '  '; __bureau_add 33 "$ibranch$git"; }
      left=$__bp lt=$__bt
      __bp='' __bt=''
      if [ "$__bureau_ok" = 1 ]; then
        lc=32 li=clear ln=CLEAR; [ "$__bc_lang" = es ] && ln=DESPEJADO
      elif [ "$__bureau_stopped" = 1 ]; then
        lc=33 li=anomaly ln=ANOMALY; [ "$__bc_lang" = es ] && ln=ANOMALÍA
      elif [ "$__bureau_fails" -ge 3 ]; then
        lc=91 li=incursion ln='HISS INCURSION'; [ "$__bc_lang" = es ] && ln='INCURSIÓN DEL SISEO'
        ln="$ln · $__bureau_code"
      else
        lc=91 li=alert ln=ALERT; [ "$__bc_lang" = es ] && ln=ALERTA
        ln="$ln · $__bureau_code"
      fi
      [ -n "$dur" ] && { __bureau_add 34 "$itime$dur"; __bureau_add '' ' '; }
      if [ "$icons" = 1 ]; then eval "li=\"\$__bureau_g_$li \""; else li=''; fi
      local now
      if [ -n "${__bureau_now:-}" ]; then now=$__bureau_now
      elif [ "${BASH_VERSINFO[0]}" -ge 5 ] || { [ "${BASH_VERSINFO[0]}" -eq 4 ] && [ "${BASH_VERSINFO[1]}" -ge 2 ]; }; then printf -v now '%(%H:%M)T' -1
      else now=$(date +%H:%M); fi
      __bureau_add "7;$lc" " $li$ln "; __bureau_add '' " $now"
      right=$__bp rt=$__bt
      fill=$(( ${__bureau_columns:-${COLUMNS:-80}} - ${#lt} - ${#rt} - 3 ))
      if [ "$fill" -ge 1 ]; then
        printf -v line '%*s' "$fill" ''
        line=${line// /─}
        __bp="$left "$'\001\033[90m\002'"$line"$'\001\033[0m\002'" $right"
      else
        __bp="$left  $right"
      fi
      __bp+=$'\n'$'\001\033['"$mark"$'m\002›\001\033[0m\002 '
      ;;
  esac
  __bureau_ps1=$__bp
}

# The header and closing line of each command (frame=1). bash has no hook
# before a command that knows its line, so PS0 writes the header (in a
# subshell) and the closing line comes first in PROMPT_COMMAND. Both take the
# line from the history: if HISTCONTROL leaves it out (a space in front, a
# repeated command with ignoreboth), the header goes without it.
__bureau_framing() {
  [ "$__bc_frame" != 0 ] || return 1
  case $__bc_style in signage | dossier | controlPoint | board | alertLevel) return 0 ;; esac
  return 1
}

# Does this line get a frame? Not cd, clear, exit... on their own.
__bureau_frame_wanted() {
  case $1 in *[\;\|\&]*) return 0 ;; esac
  case ${1%%[[:space:]]*} in cd | chdir | pushd | popd | clear | cls | reset | exit | logout) return 1 ;; esac
  return 0
}

# The line you ran in __bf_cmd ('' if it is not in the history); returns 1 if
# it gets no frame.
__bureau_frame_line() {
  __bf_cmd=''
  local re='^ *([0-9]+)\*? +(.*)' hc=${__bureau_hc:-0} last
  # Without ignorespace or HISTIGNORE, a line left out is a repeated one: the last in the history.
  case ${HISTCONTROL:-} in *ignorespace* | *ignoreboth*) ;; *) [ -z "${HISTIGNORE:-}" ] && hc=-1 ;; esac
  # The last line of the history is the one you ran if it has the number the
  # next line had when the prompt was drawn (HISTCMD itself only moves on
  # after PS0, so the DEBUG trap cannot use it).
  last=$(HISTTIMEFORMAT='' builtin history 1)
  if [[ $last =~ $re ]] && [ "${BASH_REMATCH[1]}" -ge "$hc" ]; then __bf_cmd=${BASH_REMATCH[2]}; fi
  __bureau_frame_wanted "$__bf_cmd"
}

# The header, ── ■ command ──── 14:32 ──, in __bh (separate from the hooks so
# that it can be tested with made-up data).
__bureau_head() {
  local cmd=$1 cols=$2 now=$3 L=31 max fill rule c=0
  [ "$__bc_theme" = resonant ] && L=36
  [ "$__bc_theme" = black ] && L=97
  case $cmd in *$'\n'*) cmd="${cmd%%$'\n'*} …" ;; esac
  cmd=${cmd//[[:cntrl:]]/ }
  cmd=${cmd#"${cmd%%[![:space:]]*}"}
  cmd=${cmd%"${cmd##*[![:space:]]}"}
  max=$((cols - 19))
  [ "$max" -lt 10 ] && max=10
  [ "${#cmd}" -gt "$max" ] && cmd="${cmd:0:max-1}…"
  __bh=$'\e[90m──\e[0m \e['"$L"$'m■\e[0m '
  if [ -n "$cmd" ]; then __bh+=$'\e[1m'"$cmd"$'\e[22m '; c=$((${#cmd} + 1)); fi
  fill=$((cols - 15 - c))
  [ "$fill" -lt 1 ] && fill=1
  printf -v rule '%*s' "$fill" ''
  __bh+=$'\e[90m'"${rule// /─} $now ──"$'\e[0m'
}

# The closing line, ── ✓ DONE · 4.2 s ─────, in __bf.
__bureau_foot() {
  local ok=$1 stopped=$2 code=$3 ms=$4 cols=$5 color icon label mark='' info='' dot=' · ' fill rule
  if [ "$ok" = 1 ]; then
    color=32 icon=clear label=DONE; [ "$__bc_lang" = es ] && label=COMPLETADO
  elif [ "$stopped" = 1 ]; then
    color=33 icon=anomaly label=INTERRUPTED; [ "$__bc_lang" = es ] && label=INTERRUMPIDO
  else
    color=91 icon=error label=FAILED; [ "$__bc_lang" = es ] && label=FALLO
  fi
  if [ "$__bc_icons" != 0 ]; then eval "mark=\"\$__bureau_g_$icon \""; elif [ "$ok" != 1 ]; then mark='× '; fi
  if [ "$ok" != 1 ] && [ "$stopped" != 1 ]; then
    if [ "$__bc_lang" = es ]; then info="${dot}código $code"; else info="${dot}code $code"; fi
  fi
  __bureau_duration "$ms"
  info+="$dot$__bd"
  fill=$((cols - 5 - ${#mark} - ${#label} - ${#info}))
  [ "$fill" -lt 1 ] && fill=1
  printf -v rule '%*s' "$fill" ''
  __bf=$'\e[90m──\e[0m \e[1;'"${color}m$mark$label"$'\e[0m\e[90m'"$info ${rule// /─}"$'\e[0m'
}

# PS0 runs it in a subshell, or the DEBUG trap inside VS Code (only with frames
# on: __bureau_fon), with the prompt.conf read for the prompt; it only writes.
__bureau_frame_head() {
  __bureau_framing && __bureau_frame_line || return 0
  local now
  printf -v now '%(%H:%M)T' -1
  __bureau_head "$__bf_cmd" "${COLUMNS:-80}" "$now"
  # The reset after the newline keeps it (command substitution drops the last ones).
  printf '%s\n\e[0m' "$__bh"
}

# First in PROMPT_COMMAND: the result of the command you ran.
__bureau_status() {
  local code=$? ran=0 now
  if [ -n "${__bureau_t0:-}" ]; then
    ran=1
    if [ -n "${EPOCHREALTIME:-}" ]; then now=${EPOCHREALTIME/[.,]/}; else now=$((SECONDS * 1000000)); fi
    __bureau_dur=$(((now - __bureau_t0) / 1000))
    unset __bureau_t0
  else
    __bureau_dur=0
    [ -z "${__bureau_ps0:-}" ] && ran=1
  fi
  if [ "$ran" = 1 ]; then
    __bureau_code=$code __bureau_stopped=0
    if [ "$code" = 0 ]; then
      __bureau_ok=1 __bureau_fails=0
    else
      __bureau_ok=0 __bureau_fails=$((__bureau_fails + 1))
      [ "$code" = 130 ] && __bureau_stopped=1
    fi
  fi
  # The closing line, if PS0 wrote the header (it already says how long it
  # took), with the same prompt.conf as the header: the one read for the prompt.
  if [ "$ran" = 1 ] && [ -n "$__bureau_ps0" ]; then
    if __bureau_framing && __bureau_frame_line; then
      __bureau_foot "$__bureau_ok" "$__bureau_stopped" "$__bureau_code" "$__bureau_dur" "${COLUMNS:-80}"
      printf '%s\n' "$__bf"
      __bureau_dur=0
    fi
  fi
  return "$code"
}

# Last in PROMPT_COMMAND (after the prompts of other tools): the Bureau prompt.
__bureau_prompt() {
  local code=$?
  __bureau_conf
  case $__bc_style in
    signage | dossier | controlPoint | board | alertLevel)
      __bureau_render
      # PS1 only names the variable: VS Code's shell integration wraps it once.
      case $PS1 in *'${__bureau_ps1}'*) ;; *) PS1='${__bureau_ps1}' ;; esac
      ;;
    *)
      case $PS1 in *'${__bureau_ps1}'*) PS1=$__bureau_original_ps1 ;; esac
      ;;
  esac
  # The history number before the next line: if it grows, that line went into the history.
  __bureau_hc=${HISTCMD:-0}
  # With frames off, PS0 does not even start its subshell.
  if __bureau_framing; then __bureau_fon=1; else __bureau_fon=''; fi
  return "$code"
}

# Command time: PS0 is expanded before each command (bash 4.4+); the
# arithmetic assignment stores when it started and prints nothing.
__bureau_ps0=''
if [ "${BASH_VERSINFO[0]}" -ge 5 ] || { [ "${BASH_VERSINFO[0]}" -eq 4 ] && [ "${BASH_VERSINFO[1]}" -ge 4 ]; }; then
  if [ -n "${EPOCHREALTIME:-}" ]; then
    __bureau_ps0='${BASH_VERSION:0:$((__bureau_t0=${EPOCHREALTIME/[.,]/}, 0))}'
  else
    __bureau_ps0='${BASH_VERSION:0:$((__bureau_t0=SECONDS*1000000, 0))}'
  fi
  # Inside VS Code the header goes from a DEBUG trap instead (if there is no
  # other): PS0 writes before VS Code's shell integration marks the command as
  # started, and on Linux and macOS VS Code reads the command line from the
  # screen, header included, so it would not match the command. Its shell
  # integration, loaded after this script, keeps the trap and runs it right
  # after its mark.
  if [ "${TERM_PROGRAM:-}" = vscode ] && [ -z "$(trap -p DEBUG)" ]; then
    trap '__bureau_frame_trap' DEBUG
    PS0="${PS0:-}$__bureau_ps0"
  else
    PS0="${PS0:-}"'${__bureau_fon:+$(__bureau_frame_head)}'"$__bureau_ps0"
  fi
fi

# The DEBUG trap runs before every command: the header only before the first
# one of each line you run, and none for the prompt's own commands (an empty
# line).
__bureau_frame_trap() {
  [ -n "${__bureau_fon:-}" ] || return 0
  __bureau_fon=''
  case $BASH_COMMAND in __vsc_prompt* | __bureau_status* | __bureau_prompt*) return 0 ;; esac
  __bureau_frame_head
  return 0
}
PROMPT_COMMAND="__bureau_status${PROMPT_COMMAND:+;$PROMPT_COMMAND};__bureau_prompt"

# Bureau colours for Git: git includes bureau.gitconfig, next to this script
# (the extension writes in it only the colours your Git configuration does not
# set, and nothing with them off). Git for Windows wants the Windows path.
__bureau_gc=$__bureau_dir/bureau.gitconfig
[ "$__bureau_os" = windows ] && __bureau_gc=$(cd "$__bureau_dir" && { pwd -W 2>/dev/null || cygpath -m "$PWD"; })/bureau.gitconfig
__bureau_i=0 __bureau_n=${GIT_CONFIG_COUNT:-0}
case $__bureau_n in '' | *[!0-9]*) __bureau_n=0 ;; esac
while [ "$__bureau_i" -lt "$__bureau_n" ]; do
  eval "__bureau_v=\${GIT_CONFIG_VALUE_$__bureau_i-}"
  [ "$__bureau_v" = "$__bureau_gc" ] && break
  __bureau_i=$((__bureau_i + 1))
done
[ "$__bureau_i" = "$__bureau_n" ] && export "GIT_CONFIG_KEY_$__bureau_n=include.path" "GIT_CONFIG_VALUE_$__bureau_n=$__bureau_gc" "GIT_CONFIG_COUNT=$((__bureau_n + 1))"
unset __bureau_gc __bureau_i __bureau_n __bureau_v

# The Board style greets you with one of its messages when the terminal opens.
__bureau_conf
if [ "$__bc_style" = board ]; then
  __bureau_line=${BUREAU_BOARD_LINE:-}
  if [ -z "$__bureau_line" ] && [ -r "$__bureau_dir/board.txt" ]; then
    __bureau_lines=()
    while IFS= read -r __bureau_l || [ -n "$__bureau_l" ]; do
      [ -n "$__bureau_l" ] && __bureau_lines+=("$__bureau_l")
    done < "$__bureau_dir/board.txt"
    [ "${#__bureau_lines[@]}" -gt 0 ] && __bureau_line=${__bureau_lines[RANDOM % ${#__bureau_lines[@]}]}
    unset __bureau_lines __bureau_l
  fi
  if [ -n "$__bureau_line" ]; then
    __bureau_line=${__bureau_line#<<}
    __bureau_line=${__bureau_line%>>}
    __bureau_L=31
    [ "$__bc_theme" = resonant ] && __bureau_L=36
    [ "$__bc_theme" = black ] && __bureau_L=97
    __bureau_i=''
    [ "$__bc_icons" != 0 ] && __bureau_i=$'\033['"${__bureau_L}m${__bureau_g_board}"$'\033[0m '
    printf '%s\033[%sm<<\033[0m\033[1m%s\033[22m\033[%sm>>\033[0m\n\n' "$__bureau_i" "$__bureau_L" "$__bureau_line" "$__bureau_L"
    unset __bureau_L __bureau_i
  fi
  unset __bureau_line
fi
unset BUREAU_BOARD_LINE
fi

# VS Code shell integration (command decorations, sticky scroll...): the Bureau
# profile starts bash with its own arguments, so VS Code does not inject it and
# it is loaded here, after the prompt, so that it wraps it.
if [ -n "${BUREAU_VSCODE_SI:-}" ] && [ "${TERM_PROGRAM:-}" = vscode ] && [ -z "${VSCODE_SHELL_INTEGRATION:-}" ]; then
  if [ -r "$BUREAU_VSCODE_SI" ]; then
    # bash hides the DEBUG trap from a sourced file (unless functrace is on):
    # with it on, VS Code's script sees the trap of the header and runs it
    # after its own mark, instead of replacing it.
    if shopt -oq functrace; then
      . "$BUREAU_VSCODE_SI"
    else
      set -T
      . "$BUREAU_VSCODE_SI"
      set +T
    fi
  fi
fi
unset BUREAU_VSCODE_SI
