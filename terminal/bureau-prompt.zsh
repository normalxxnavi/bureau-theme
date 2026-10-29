# Bureau prompt for zsh (5.0 and later; Classified needs 5.3).
# CONTROL theme for VS Code - https://github.com/Normalxxnavi/bureau-theme
#
# The extension copies this file to its data folder and loads it from the Bureau
# terminal profile (or from your ~/.zshrc, if you install the prompt outside
# VS Code). Before each prompt it reads prompt.conf, next to it, so the changes
# you make in VS Code apply at once. With style=off it gives your prompt back.

[[ -o interactive ]] || return 0

if [[ -z ${__bureau_loaded-} ]]; then
typeset -g __bureau_loaded=1
typeset -g __bureau_dir=${${(%):-%x}:A:h}
typeset -g __bureau_original_prompt=$PROMPT __bureau_original_rprompt=$RPROMPT
typeset -g __bureau_ok=1 __bureau_code=0 __bureau_fails=0 __bureau_stopped=0
typeset -gi __bureau_dur=0
typeset -g __bureau_t0='' __bureau_transient=0 __bureau_prompt='' __bureau_framed=0
typeset -g __bureau_os=linux
[[ $OSTYPE == darwin* ]] && __bureau_os=macos
[[ $OSTYPE == (msys|cygwin)* ]] && __bureau_os=windows
zmodload zsh/datetime 2>/dev/null
setopt prompt_subst

# Icons of the Bureau Prompt Icons font (U+E1B0-U+E1BF, UTF-8 bytes).
typeset -gA __bureau_g=(
  controlPoints $'\xee\x86\xb0' house $'\xee\x86\xb1' command $'\xee\x86\xb2' apple $'\xee\x86\xb3'
  tux $'\xee\x86\xb4' tuxMop $'\xee\x86\xb5' folder $'\xee\x86\xb6' branch $'\xee\x86\xb7'
  time $'\xee\x86\xb8' error $'\xee\x86\xb9' clear $'\xee\x86\xba' anomaly $'\xee\x86\xbb'
  alert $'\xee\x86\xbc' incursion $'\xee\x86\xbd' board $'\xee\x86\xbe' classified $'\xee\x86\xbf'
)

# prompt.conf: one key per line, letters only (it is never evaluated).
__bureau_conf() {
  typeset -g __bc_style='' __bc_classified=0 __bc_icons=1 __bc_windows=controlPoints __bc_macos=command __bc_linux=tux __bc_frame=1 __bc_theme=other __bc_lang=en
  local k v
  [[ -r $__bureau_dir/prompt.conf ]] || return 0
  while IFS='=' read -r k v || [[ -n $k ]]; do
    v=${v%$'\r'}
    case $k in
      style) __bc_style=$v ;;
      classified) __bc_classified=$v ;;
      icons) __bc_icons=$v ;;
      windows) __bc_windows=$v ;;
      macos) __bc_macos=$v ;;
      linux) __bc_linux=$v ;;
      frame) __bc_frame=$v ;;
      theme) __bc_theme=$v ;;
      lang) __bc_lang=$v ;;
    esac
  done < $__bureau_dir/prompt.conf
}

# Git: branch, commits ahead/behind and changed files. Only inside a repository
# (no git process in other folders). Without core.fsmonitor: in a repository
# you did not create (an archive you extracted), its .git/config could name a
# program that git status would run on every prompt.
__bureau_git() {
  typeset -g __bg_branch='' __bg_counts=''
  local dir=$PWD line oid='' ahead=0 behind=0 changes=0
  while [[ ! -e $dir/.git ]]; do
    # Up to the root: also C:/… (no / left), where ${dir%/*} would not change it.
    [[ $dir == */* ]] || return 1
    dir=${dir%/*}
  done
  (( $+commands[git] )) || return 1
  while IFS= read -r line; do
    case $line in
      ('# branch.head '*) __bg_branch=${line#'# branch.head '} ;;
      ('# branch.oid '*) oid=${line#'# branch.oid '} ;;
      ('# branch.ab '*)
        line=${line#'# branch.ab +'}
        ahead=${line%% *}
        behind=${line##*-}
        ;;
      ('#'*) ;;
      (*) (( changes++ )) ;;
    esac
  done < <(command git -c core.fsmonitor= --no-optional-locks status --porcelain=v2 --branch 2>/dev/null)
  [[ $__bg_branch == '(detached)' ]] && __bg_branch=${oid[1,7]}
  (( ahead )) && __bg_counts="↑$ahead"
  (( behind )) && __bg_counts="${__bg_counts:+$__bg_counts }↓$behind"
  (( changes )) && __bg_counts="${__bg_counts:+$__bg_counts }~$changes"
  [[ -n $__bg_branch ]]
}

# Adds text with an SGR colour ($1, '' = none) to the prompt being built. %{ %}
# tell zsh that the escape sequences take no room; % in the text is doubled.
__bureau_add() {
  local text=${2//\%/%%}
  if [[ -n $1 ]]; then
    __bp+="%{"$'\e['"$1"m"%}$text%{"$'\e[0m'"%}"
  else
    __bp+=$text
  fi
  __bt+=$2
}

__bureau_duration() {
  local ms=$1 t
  if (( ms < 10000 )); then
    t=$(( ms / 100 ))
    (( ${#t} < 2 )) && t=0$t
    t="${t[1,-2]}.${t[-1]}"
    [[ $__bc_lang == es ]] && t=${t/./,}
    __bd="$t s"
  elif (( ms < 60000 )); then
    __bd="$(( ms / 1000 )) s"
  else
    __bd="$(( ms / 60000 )) min $(( ms / 1000 % 60 )) s"
  fi
}

# Builds the prompt in __bureau_prompt from the state and prompt.conf. Separate
# from the hooks so that it can be tested with made-up data.
__bureau_render() {
  local A=31 L=31 icons=0 os='' git='' dur='' mark
  [[ $__bc_theme == resonant ]] && A=36 L=36
  [[ $__bc_theme == black ]] && L=97
  [[ $__bc_icons != 0 ]] && icons=1
  # (not "path": in zsh it is tied to PATH)
  local cwd=$PWD leaf
  case $PWD in
    ($HOME) cwd='~' ;;
    ($HOME/*) cwd="~${PWD#$HOME}" ;;
  esac
  leaf=${cwd##*/}
  [[ -z $leaf ]] && leaf=$cwd
  if (( icons )); then
    case $__bureau_os in
      (windows) os=$__bc_windows ;;
      (macos) os=$__bc_macos ;;
      (*) os=$__bc_linux ;;
    esac
    # Every icon carries the space behind it: the drawing fills both cells, centred.
    os="${__bureau_g[$os]:-${__bureau_g[controlPoints]}} "
  else
    os=FBC
  fi
  local ifold='' ibranch='' itime='' ierr='× '
  if (( icons )); then
    ifold="${__bureau_g[folder]} " ibranch="${__bureau_g[branch]} " itime="${__bureau_g[time]} " ierr="${__bureau_g[error]} "
  fi
  if __bureau_git; then git=$__bg_branch${__bg_counts:+ $__bg_counts}; fi
  if (( ${__bureau_dur:-0} >= 2000 )); then __bureau_duration $__bureau_dur; dur=$__bd; fi
  mark=$L
  (( __bureau_ok )) || mark=91
  local __bp='' __bt=''

  if (( __bureau_transient )); then
    local -i n=${#cwd}
    (( n < 8 )) && n=8
    (( n > 32 )) && n=32
    local bar=${(l:n:: :)}
    (( icons )) && { __bureau_add 90 ${__bureau_g[classified]}; __bureau_add '' ' '; }
    __bureau_add 7 $bar
    case $__bc_style in
      (dossier) __bureau_add '' $'\n'; __bureau_add 90 '└─'; __bureau_add $L '■'; __bureau_add '' ' ' ;;
      (alertLevel) __bureau_add '' $'\n'; __bureau_add $L '›'; __bureau_add '' ' ' ;;
      (*) __bureau_add '' ' '; __bureau_add $L '›'; __bureau_add '' ' ' ;;
    esac
    __bureau_prompt=$__bp
    return
  fi

  case $__bc_style in
    (signage)
      __bureau_add "7;$A" " $os "; __bureau_add '' ' '
      __bureau_add 7 " $ifold$cwd "
      [[ -n $git ]] && { __bureau_add '' ' '; __bureau_add '7;33' " $ibranch$git "; }
      [[ -n $dur ]] && { __bureau_add '' ' '; __bureau_add '7;34' " $itime$dur "; }
      (( __bureau_ok )) || { __bureau_add '' ' '; __bureau_add '7;91' " $ierr$__bureau_code "; }
      __bureau_add '' ' '; __bureau_add $mark '›'; __bureau_add '' ' '
      ;;
    (dossier)
      __bureau_add 90 '┌─['; __bureau_add $A $os; __bureau_add 90 ']─['
      __bureau_add '' "$ifold$cwd"; __bureau_add 90 ']'
      [[ -n $git ]] && { __bureau_add 90 '─['; __bureau_add 33 "$ibranch$git"; __bureau_add 90 ']'; }
      [[ -n $dur ]] && { __bureau_add 90 '─['; __bureau_add 34 "$itime$dur"; __bureau_add 90 ']'; }
      (( __bureau_ok )) || { __bureau_add 90 '─['; __bureau_add 91 "$ierr$__bureau_code"; __bureau_add 90 ']'; }
      __bureau_add '' $'\n'; __bureau_add 90 '└─'; __bureau_add $mark '■'; __bureau_add '' ' '
      ;;
    (controlPoint)
      if (( __bureau_ok )); then __bureau_add $L '■'; else __bureau_add 91 '□'; fi
      (( icons )) && { __bureau_add '' ' '; __bureau_add 90 ${__bureau_g[folder]}; }
      __bureau_add '' ' '; __bureau_add 1 $leaf
      [[ -n $git ]] && { __bureau_add '' ' '; __bureau_add 33 "$ibranch$git"; }
      [[ -n $dur ]] && { __bureau_add '' ' '; __bureau_add 34 "$itime$dur"; }
      __bureau_add '' ' '
      if (( __bureau_ok )); then __bureau_add $L '›'; else __bureau_add 91 "$ierr$__bureau_code ›"; fi
      __bureau_add '' ' '
      ;;
    (board)
      (( icons )) && { __bureau_add $L ${__bureau_g[board]}; __bureau_add '' ' '; }
      __bureau_add $L '<<'; __bureau_add 1 ${(U)leaf}; __bureau_add $L '>>'
      if [[ -n $git ]]; then
        __bureau_add '' ' '; __bureau_add 33 "$ibranch(${(U)__bg_branch}.)"
        [[ -n $__bg_counts ]] && { __bureau_add '' ' '; __bureau_add 90 "($__bg_counts.)"; }
      fi
      [[ -n $dur ]] && { __bureau_add '' ' '; __bureau_add 34 "$itime(${(U)dur}.)"; }
      (( __bureau_ok )) || { __bureau_add '' ' '; __bureau_add 91 "$ierr(ERROR $__bureau_code.) ($__bureau_code.)"; }
      __bureau_add '' ' '; __bureau_add $mark '›'; __bureau_add '' ' '
      ;;
    (alertLevel)
      local left lt right rt lc li ln fill
      (( icons )) && { __bureau_add 90 ${__bureau_g[folder]}; __bureau_add '' ' '; }
      __bureau_add 1 $cwd
      [[ -n $git ]] && { __bureau_add '' '  '; __bureau_add 33 "$ibranch$git"; }
      left=$__bp lt=$__bt
      __bp='' __bt=''
      if (( __bureau_ok )); then
        lc=32 li=clear ln=CLEAR; [[ $__bc_lang == es ]] && ln=DESPEJADO
      elif (( __bureau_stopped )); then
        lc=33 li=anomaly ln=ANOMALY; [[ $__bc_lang == es ]] && ln=ANOMALÍA
      elif (( __bureau_fails >= 3 )); then
        lc=91 li=incursion ln='HISS INCURSION'; [[ $__bc_lang == es ]] && ln='INCURSIÓN DEL SISEO'
        ln="$ln · $__bureau_code"
      else
        lc=91 li=alert ln=ALERT; [[ $__bc_lang == es ]] && ln=ALERTA
        ln="$ln · $__bureau_code"
      fi
      [[ -n $dur ]] && { __bureau_add 34 "$itime$dur"; __bureau_add '' ' '; }
      if (( icons )); then li="${__bureau_g[$li]} "; else li=''; fi
      __bureau_add "7;$lc" " $li$ln "
      # The clock is a prompt escape (no process): it takes five cells.
      if [[ -n ${__bureau_now-} ]]; then __bureau_add '' " $__bureau_now"; else __bp+=' %D{%H:%M}' __bt+=' 00:00'; fi
      right=$__bp rt=$__bt
      fill=$(( ${__bureau_columns:-${COLUMNS:-80}} - ${#lt} - ${#rt} - 3 ))
      if (( fill >= 1 )); then
        __bp="$left %{"$'\e[90m'"%}${(l:$fill::─:)}%{"$'\e[0m'"%} $right"
      else
        __bp="$left  $right"
      fi
      __bp+=$'\n'"%{"$'\e['"${mark}m"'%}›%{'$'\e[0m''%} '
      ;;
  esac
  __bureau_prompt=$__bp
}

# The header and closing line of each command (frame=1): the header in
# preexec, the closing line in the first precmd hook. Not for cd, clear, exit...
__bureau_frame_wanted() {
  [[ -n ${1//[[:space:]]/} ]] || return 1
  [[ $1 == *[\;\|\&]* ]] && return 0
  # (An array: with a single word, ${${(z)1}[1]} would be its first letter.)
  local -a words=(${(z)1})
  case $words[1] in
    (cd|chdir|pushd|popd|clear|cls|reset|exit|logout) return 1 ;;
  esac
  return 0
}

# The header, ── ■ command ──── 14:32 ──, in __bh (separate from the hooks so
# that it can be tested with made-up data).
__bureau_head() {
  local cmd=$1 L=31
  local -i cols=$2 max c=0 fill
  [[ $__bc_theme == resonant ]] && L=36
  [[ $__bc_theme == black ]] && L=97
  [[ $cmd == *$'\n'* ]] && cmd="${cmd%%$'\n'*} …"
  cmd=${cmd//[[:cntrl:]]/ }
  setopt local_options extended_glob
  cmd=${${cmd##[[:space:]]#}%%[[:space:]]#}
  max=$(( cols - 19 ))
  (( max < 10 )) && max=10
  (( ${#cmd} > max )) && cmd="${cmd[1,max-1]}…"
  typeset -g __bh=$'\e[90m──\e[0m \e['"$L"$'m■\e[0m '
  if [[ -n $cmd ]]; then __bh+=$'\e[1m'"$cmd"$'\e[22m '; c=$(( ${#cmd} + 1 )); fi
  fill=$(( cols - 15 - c ))
  (( fill < 1 )) && fill=1
  __bh+=$'\e[90m'"${(l:$fill::─:)} $3 ──"$'\e[0m'
}

# The closing line, ── ✓ DONE · 4.2 s ─────, in __bf.
__bureau_foot() {
  local ok=$1 stopped=$2 code=$3 color icon label mark='' info='' dot=' · '
  local -i fill
  if (( ok )); then
    color=32 icon=clear label=DONE; [[ $__bc_lang == es ]] && label=COMPLETADO
  elif (( stopped )); then
    color=33 icon=anomaly label=INTERRUPTED; [[ $__bc_lang == es ]] && label=INTERRUMPIDO
  else
    color=91 icon=error label=FAILED; [[ $__bc_lang == es ]] && label=FALLO
  fi
  if [[ $__bc_icons != 0 ]]; then mark="${__bureau_g[$icon]} "; elif (( ! ok )); then mark='× '; fi
  if (( ! ok && ! stopped )); then
    if [[ $__bc_lang == es ]]; then info="${dot}código $code"; else info="${dot}code $code"; fi
  fi
  __bureau_duration $4
  info+="$dot$__bd"
  fill=$(( $5 - 5 - ${#mark} - ${#label} - ${#info} ))
  (( fill < 1 )) && fill=1
  typeset -g __bf=$'\e[90m──\e[0m \e[1;'"${color}m$mark$label"$'\e[0m\e[90m'"$info ${(l:$fill::─:)}"$'\e[0m'
}

# First precmd hook: the result of the command you ran.
__bureau_status() {
  local code=$?
  if [[ -n $__bureau_t0 ]]; then
    (( __bureau_dur = (${EPOCHREALTIME:-$SECONDS} - __bureau_t0) * 1000 ))
    __bureau_t0=''
    __bureau_code=$code __bureau_stopped=0
    if (( code == 0 )); then
      __bureau_ok=1 __bureau_fails=0
    else
      __bureau_ok=0
      (( __bureau_fails++ ))
      (( code == 130 )) && __bureau_stopped=1
    fi
    # The closing line, if preexec wrote the header (it already says how long it took).
    if (( __bureau_framed )); then
      __bureau_foot $__bureau_ok $__bureau_stopped $__bureau_code $__bureau_dur ${COLUMNS:-80}
      print -r -- $__bf
      __bureau_dur=0
    fi
  else
    __bureau_dur=0
  fi
  __bureau_framed=0
  return $code
}

# $1 is the line as you typed it ('' without history), $2 the one that runs.
__bureau_preexec() {
  __bureau_t0=${EPOCHREALTIME:-$SECONDS}
  __bureau_framed=0
  [[ $__bc_frame != 0 && $__bc_style == (signage|dossier|controlPoint|board|alertLevel) ]] || return 0
  local cmd=${1:-$2} fmt='%D{%H:%M}'
  __bureau_frame_wanted $cmd || return 0
  __bureau_framed=1
  __bureau_head $cmd ${COLUMNS:-80} ${(%)fmt}
  print -r -- $__bh
}

# Last precmd hook (after the prompts of other tools): the Bureau prompt.
__bureau_precmd() {
  __bureau_conf
  __bureau_transient=0
  case $__bc_style in
    (signage|dossier|controlPoint|board|alertLevel)
      __bureau_render
      # PROMPT only names the variable: VS Code's shell integration wraps it.
      [[ $PROMPT == *'${__bureau_prompt}'* ]] || PROMPT='${__bureau_prompt}'
      RPROMPT=''
      ;;
    (*)
      if [[ $PROMPT == *'${__bureau_prompt}'* ]]; then
        PROMPT=$__bureau_original_prompt RPROMPT=$__bureau_original_rprompt
      fi
      ;;
  esac
}

# Classified: when you press Enter, the prompt is redrawn with a redaction bar.
__bureau_line_finish() {
  [[ $__bc_classified == 1 && $PROMPT == *'${__bureau_prompt}'* ]] || return 0
  __bureau_transient=1
  __bureau_render
  zle .reset-prompt
}

autoload -Uz add-zsh-hook
precmd_functions=(__bureau_status ${precmd_functions:#__bureau_status})
add-zsh-hook precmd __bureau_precmd
add-zsh-hook preexec __bureau_preexec
if autoload -Uz add-zle-hook-widget 2>/dev/null; then
  zle -N __bureau_line_finish
  add-zle-hook-widget line-finish __bureau_line_finish 2>/dev/null
fi

# Bureau colours for Git: git includes bureau.gitconfig, next to this script
# (the extension writes in it only the colours your Git configuration does not
# set, and nothing with them off).
() {
  local file=$__bureau_dir/bureau.gitconfig var
  [[ $__bureau_os == windows ]] && (( $+commands[cygpath] )) && file=$(cygpath -m $file)
  local -i n=0 i
  [[ ${GIT_CONFIG_COUNT-} == <-> ]] && n=$GIT_CONFIG_COUNT
  for (( i = 0; i < n; i++ )); do
    var=GIT_CONFIG_VALUE_$i
    [[ ${(P)var-} == $file ]] && return
  done
  export GIT_CONFIG_KEY_$n=include.path GIT_CONFIG_VALUE_$n=$file GIT_CONFIG_COUNT=$(( n + 1 ))
}

# The Board style greets you with one of its messages when the terminal opens.
__bureau_conf
if [[ $__bc_style == board ]]; then
  () {
    local line=${BUREAU_BOARD_LINE:-} L=31 icon=''
    local -a lines
    if [[ -z $line && -r $__bureau_dir/board.txt ]]; then
      lines=("${(@f)$(< $__bureau_dir/board.txt)}")
      lines=(${lines:#})
      (( ${#lines} )) && line=${lines[$(( RANDOM % ${#lines} + 1 ))]}
    fi
    [[ -n $line ]] || return 0
    line=${${line#<<}%>>}
    [[ $__bc_theme == resonant ]] && L=36
    [[ $__bc_theme == black ]] && L=97
    [[ $__bc_icons != 0 ]] && icon=$'\e['"${L}m${__bureau_g[board]}"$'\e[0m '
    print -r -- "$icon"$'\e['"${L}m<<"$'\e[0m\e[1m'"$line"$'\e[22m\e['"${L}m>>"$'\e[0m'
    print
  }
fi
unset BUREAU_BOARD_LINE
fi

# VS Code shell integration (command decorations, sticky scroll...): the Bureau
# profile starts zsh with its own arguments, so VS Code does not inject it and
# it is loaded here, after the prompt, so that it wraps it.
if [[ -n ${BUREAU_VSCODE_SI-} && ${TERM_PROGRAM-} == vscode && -z ${VSCODE_SHELL_INTEGRATION-} && -r $BUREAU_VSCODE_SI ]]; then
  builtin source $BUREAU_VSCODE_SI
fi
unset BUREAU_VSCODE_SI
