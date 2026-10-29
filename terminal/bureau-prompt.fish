# Bureau prompt for fish (3.1 and later).
# CONTROL theme for VS Code - https://github.com/Normalxxnavi/bureau-theme
#
# The extension copies this file to its data folder and loads it from the Bureau
# terminal profile (or from conf.d, if you install the prompt outside VS Code).
# Before each prompt it reads prompt.conf, next to it, so the changes you make
# in VS Code apply at once. With style=off it gives your prompt back.

status is-interactive; or return 0

if not set -q __bureau_loaded
    set -g __bureau_loaded 1
    set -g __bureau_dir (path dirname (status --current-filename) 2>/dev/null; or dirname (status --current-filename))
    set -g __bureau_ok 1
    set -g __bureau_code 0
    set -g __bureau_fails 0
    set -g __bureau_stopped 0
    set -g __bureau_dur 0
    set -g __bureau_ran 0
    set -g __bureau_transient 0
    set -g __bureau_framed 0
    set -g __bureau_os linux
    switch (uname -s 2>/dev/null)
        case Darwin
            set __bureau_os macos
        case 'MINGW*' 'MSYS*' 'CYGWIN*'
            set __bureau_os windows
    end

    # Icons of the Bureau Prompt Icons font (U+E1B0-U+E1BF).
    set -g __bureau_g_controlPoints \ue1b0
    set -g __bureau_g_house \ue1b1
    set -g __bureau_g_command \ue1b2
    set -g __bureau_g_apple \ue1b3
    set -g __bureau_g_tux \ue1b4
    set -g __bureau_g_tuxMop \ue1b5
    set -g __bureau_g_folder \ue1b6
    set -g __bureau_g_branch \ue1b7
    set -g __bureau_g_time \ue1b8
    set -g __bureau_g_error \ue1b9
    set -g __bureau_g_clear \ue1ba
    set -g __bureau_g_anomaly \ue1bb
    set -g __bureau_g_alert \ue1bc
    set -g __bureau_g_incursion \ue1bd
    set -g __bureau_g_board \ue1be
    set -g __bureau_g_classified \ue1bf

    # Can the terminal draw the icons? They come from a font of their own,
    # which the terminal has to look for behind yours: VS Code, Windows
    # Terminal and the terminals of macOS and Linux do. On Windows, mintty only
    # does it from 3.8.3 on, with the FontSubst line the extension adds to its
    # config when you use the prompt outside VS Code; the classic console never
    # does. There the prompt goes without icons. BUREAU_PROMPT_ICONS=1 or 0
    # decides instead.
    function __bureau_icons_ok
        set -q BUREAU_PROMPT_ICONS; and test "$BUREAU_PROMPT_ICONS" = 1; and return 0
        set -q BUREAU_PROMPT_ICONS; and test "$BUREAU_PROMPT_ICONS" = 0; and return 1
        set -q TERM; and contains -- $TERM linux dumb; and return 1
        test $__bureau_os = windows; or return 0
        if test "$TERM_PROGRAM" = vscode; or test -n "$WT_SESSION"
            return 0
        end
        test "$TERM_PROGRAM" = mintty; or return 1
        set -l v (string split . -- "$TERM_PROGRAM_VERSION") 0 0 0
        for i in 1 2 3
            set v[$i] (string replace -r '[^0-9].*$' '' -- $v[$i])
            test -n "$v[$i]"; or set v[$i] 0
        end
        test (math "$v[1] * 10000 + $v[2] * 100 + $v[3]") -ge 30803; or return 1
        set -l file (string replace -a '\\' / -- "$APPDATA")/mintty/config
        test -r $file; or return 1
        set -l lines (string trim -r -c \r -- (cat $file))
        contains -- 'Font9=Bureau Prompt Icons' $lines; and contains -- FontSubst=9 $lines
    end
    set -g __bureau_noicons 0
    __bureau_icons_ok; or set __bureau_noicons 1

    # Your prompt, to give it back with style=off.
    if functions -q fish_prompt; and not functions -q __bureau_original_fish_prompt
        functions -c fish_prompt __bureau_original_fish_prompt
    end

    # prompt.conf: one key per line, letters only (it is never evaluated).
    function __bureau_conf
        set -g __bc_style ''
        set -g __bc_classified 0
        set -g __bc_icons 1
        set -g __bc_windows controlPoints
        set -g __bc_macos command
        set -g __bc_linux tux
        set -g __bc_frame 1
        set -g __bc_theme other
        set -g __bc_lang en
        test -r $__bureau_dir/prompt.conf; or return 0
        while read -l line
            set -l kv (string split -m 1 = -- (string trim -- $line))
            test (count $kv) -eq 2; or continue
            switch $kv[1]
                case style classified icons windows macos linux frame theme lang
                    set -g __bc_$kv[1] $kv[2]
            end
        end <$__bureau_dir/prompt.conf
        test $__bureau_noicons = 1; and set -g __bc_icons 0
        return 0
    end

    # Git: branch, commits ahead/behind and changed files. Only inside a
    # repository (no git process in other folders). Without core.fsmonitor: in
    # a repository you did not create (an archive you extracted), its
    # .git/config could name a program that git status would run on every prompt.
    function __bureau_git
        set -g __bg_branch ''
        set -g __bg_counts ''
        set -l dir $PWD
        while not test -e "$dir/.git"
            # Up to the root: also C:/… (no / left), where the replace would not change it.
            string match -q '*/*' -- $dir; or return 1
            set dir (string replace -r '/[^/]*$' '' -- $dir)
        end
        command -q git; or return 1
        set -l oid ''
        set -l ahead 0
        set -l behind 0
        set -l changes 0
        for line in (command git -c core.fsmonitor= --no-optional-locks status --porcelain=v2 --branch 2>/dev/null)
            switch $line
                case '# branch.head *'
                    set __bg_branch (string sub -s 15 -- $line)
                case '# branch.oid *'
                    set oid (string sub -s 14 -- $line)
                case '# branch.ab *'
                    set -l ab (string match -r '\+(\d+) -(\d+)' -- $line)
                    set ahead $ab[2]
                    set behind $ab[3]
                case '#*'
                case '*'
                    set changes (math $changes + 1)
            end
        end
        test "$__bg_branch" = '(detached)'; and set __bg_branch (string sub -l 7 -- $oid)
        set -l counts
        test "$ahead" != 0; and set -a counts "↑$ahead"
        test "$behind" != 0; and set -a counts "↓$behind"
        test "$changes" != 0; and set -a counts "~$changes"
        set __bg_counts (string join ' ' -- $counts)
        test -n "$__bg_branch"
    end

    # Adds text with an SGR colour ($argv[1], '' = none) to the prompt being built.
    function __bureau_add
        if test -n "$argv[1]"
            set -ga __bp \e\[$argv[1]m$argv[2]\e\[0m
        else
            set -ga __bp $argv[2]
        end
    end

    function __bureau_duration -a ms
        if test $ms -lt 10000
            set -l t (math --scale=1 "floor($ms / 100) / 10")
            string match -q '*.*' -- $t; or set t $t.0
            test "$__bc_lang" = es; and set t (string replace . , -- $t)
            echo "$t s"
        else if test $ms -lt 60000
            echo (math --scale=0 "floor($ms / 1000)") s
        else
            echo (math --scale=0 "floor($ms / 60000)") min (math --scale=0 "floor($ms / 1000) % 60") s
        end
    end

    # The prompt from the state and prompt.conf. Separate from fish_prompt so
    # that it can be tested with made-up data.
    function __bureau_render
        set -l A 31
        set -l L 31
        test "$__bc_theme" = resonant; and set A 36; and set L 36
        test "$__bc_theme" = black; and set L 97
        set -l icons 0
        test "$__bc_icons" != 0; and set icons 1
        set -l cwd (string replace -r -- '^'(string escape --style=regex -- $HOME)'(?=/|$)' '~' $PWD)
        set -l leaf (string replace -r -- '.*/' '' $cwd)
        test -z "$leaf"; and set leaf $cwd
        set -l os FBC
        set -l ifold ''
        set -l ibranch ''
        set -l itime ''
        set -l ierr '× '
        if test $icons = 1
            set -l name $__bc_linux
            test $__bureau_os = windows; and set name $__bc_windows
            test $__bureau_os = macos; and set name $__bc_macos
            set -q __bureau_g_$name; or set name controlPoints
            set -l var __bureau_g_$name
            # Every icon carries the space behind it: the drawing fills both cells, centred.
            set os "$$var "
            set ifold "$__bureau_g_folder "
            set ibranch "$__bureau_g_branch "
            set itime "$__bureau_g_time "
            set ierr "$__bureau_g_error "
        end
        set -l git ''
        if __bureau_git
            set git $__bg_branch
            test -n "$__bg_counts"; and set git "$git $__bg_counts"
        end
        set -l dur ''
        test $__bureau_dur -ge 2000; and set dur (__bureau_duration $__bureau_dur)
        set -l mark $L
        test $__bureau_ok = 1; or set mark 91
        set -g __bp

        if test $__bureau_transient = 1
            set -l n (string length -- $cwd)
            test $n -lt 8; and set n 8
            test $n -gt 32; and set n 32
            test $icons = 1; and __bureau_add 90 $__bureau_g_classified; and __bureau_add '' ' '
            __bureau_add 7 (string repeat -n $n ' ')
            switch $__bc_style
                case dossier
                    __bureau_add '' \n
                    __bureau_add 90 '└─'
                    __bureau_add $L '■'
                case alertLevel
                    __bureau_add '' \n
                    __bureau_add $L '›'
                case '*'
                    __bureau_add '' ' '
                    __bureau_add $L '›'
            end
            __bureau_add '' ' '
            string join '' -- $__bp
            return
        end

        switch $__bc_style
            case signage
                __bureau_add "7;$A" " $os "
                __bureau_add '' ' '
                __bureau_add 7 " $ifold$cwd "
                test -n "$git"; and __bureau_add '' ' '; and __bureau_add '7;33' " $ibranch$git "
                test -n "$dur"; and __bureau_add '' ' '; and __bureau_add '7;34' " $itime$dur "
                test $__bureau_ok = 1; or begin
                    __bureau_add '' ' '
                    __bureau_add '7;91' " $ierr$__bureau_code "
                end
                __bureau_add '' ' '
                __bureau_add $mark '›'
                __bureau_add '' ' '
            case dossier
                __bureau_add 90 '┌─['
                __bureau_add $A $os
                __bureau_add 90 ']─['
                __bureau_add '' "$ifold$cwd"
                __bureau_add 90 ']'
                test -n "$git"; and __bureau_add 90 '─['; and __bureau_add 33 "$ibranch$git"; and __bureau_add 90 ']'
                test -n "$dur"; and __bureau_add 90 '─['; and __bureau_add 34 "$itime$dur"; and __bureau_add 90 ']'
                test $__bureau_ok = 1; or begin
                    __bureau_add 90 '─['
                    __bureau_add 91 "$ierr$__bureau_code"
                    __bureau_add 90 ']'
                end
                __bureau_add '' \n
                __bureau_add 90 '└─'
                __bureau_add $mark '■'
                __bureau_add '' ' '
            case controlPoint
                if test $__bureau_ok = 1
                    __bureau_add $L '■'
                else
                    __bureau_add 91 '□'
                end
                test $icons = 1; and __bureau_add '' ' '; and __bureau_add 90 $__bureau_g_folder
                __bureau_add '' ' '
                __bureau_add 1 $leaf
                test -n "$git"; and __bureau_add '' ' '; and __bureau_add 33 "$ibranch$git"
                test -n "$dur"; and __bureau_add '' ' '; and __bureau_add 34 "$itime$dur"
                __bureau_add '' ' '
                if test $__bureau_ok = 1
                    __bureau_add $L '›'
                else
                    __bureau_add 91 "$ierr$__bureau_code ›"
                end
                __bureau_add '' ' '
            case board
                test $icons = 1; and __bureau_add $L $__bureau_g_board; and __bureau_add '' ' '
                __bureau_add $L '<<'
                __bureau_add 1 (string upper -- $leaf)
                __bureau_add $L '>>'
                if test -n "$git"
                    __bureau_add '' ' '
                    __bureau_add 33 "$ibranch("(string upper -- $__bg_branch)".)"
                    test -n "$__bg_counts"; and __bureau_add '' ' '; and __bureau_add 90 "($__bg_counts.)"
                end
                test -n "$dur"; and __bureau_add '' ' '; and __bureau_add 34 "$itime("(string upper -- $dur)".)"
                test $__bureau_ok = 1; or begin
                    __bureau_add '' ' '
                    __bureau_add 91 "$ierr(ERROR $__bureau_code.) ($__bureau_code.)"
                end
                __bureau_add '' ' '
                __bureau_add $mark '›'
                __bureau_add '' ' '
            case alertLevel
                test $icons = 1; and __bureau_add 90 $__bureau_g_folder; and __bureau_add '' ' '
                __bureau_add 1 $cwd
                test -n "$git"; and __bureau_add '' '  '; and __bureau_add 33 "$ibranch$git"
                set -l left (string join '' -- $__bp)
                set -g __bp
                set -l lc 91
                set -l li alert
                set -l ln ALERT
                test "$__bc_lang" = es; and set ln ALERTA
                if test $__bureau_ok = 1
                    set lc 32
                    set li clear
                    set ln CLEAR
                    test "$__bc_lang" = es; and set ln DESPEJADO
                else if test $__bureau_stopped = 1
                    set lc 33
                    set li anomaly
                    set ln ANOMALY
                    test "$__bc_lang" = es; and set ln ANOMALÍA
                else if test $__bureau_fails -ge 3
                    set li incursion
                    set ln 'HISS INCURSION'
                    test "$__bc_lang" = es; and set ln 'INCURSIÓN DEL SISEO'
                end
                test $__bureau_ok = 1 -o $__bureau_stopped = 1; or set ln "$ln · $__bureau_code"
                test -n "$dur"; and __bureau_add 34 "$itime$dur"; and __bureau_add '' ' '
                set -l icon ''
                if test $icons = 1
                    set -l var __bureau_g_$li
                    set icon "$$var "
                end
                set -l now (date +%H:%M)
                set -q __bureau_now; and set now $__bureau_now
                __bureau_add "7;$lc" " $icon$ln "
                __bureau_add '' " $now"
                set -l right (string join '' -- $__bp)
                set -l columns $COLUMNS
                set -q __bureau_columns; and set columns $__bureau_columns
                set -l fill (math $columns - (string length --visible -- $left) - (string length --visible -- $right) - 3)
                set -g __bp
                if test $fill -ge 1
                    __bureau_add '' "$left "
                    __bureau_add 90 (string repeat -n $fill '─')
                    __bureau_add '' " $right"
                else
                    __bureau_add '' "$left  $right"
                end
                __bureau_add '' \n
                __bureau_add $mark '›'
                __bureau_add '' ' '
        end
        string join '' -- $__bp
    end

    # The header and closing line of each command (frame=1): the header in
    # fish_preexec, the closing line in fish_postexec. Not for cd, clear, exit...
    function __bureau_frame_wanted -a cmd
        string match -qr '\S' -- $cmd; or return 1
        string match -qr '[;|&]' -- $cmd; and return 0
        set -l first (string split ' ' -- (string trim -- $cmd))[1]
        not contains -- $first cd chdir pushd popd clear cls reset exit logout
    end

    # The header, ── ■ command ──── 14:32 ── (separate from the events so that
    # it can be tested with made-up data).
    function __bureau_head -a cmd cols now
        set -l L 31
        test "$__bc_theme" = resonant; and set L 36
        test "$__bc_theme" = black; and set L 97
        set -l lines (string split \n -- $cmd)
        set cmd (string trim -- (string replace -ra '[[:cntrl:]]' ' ' -- "$lines[1]"))
        test (count $lines) -gt 1; and set cmd "$cmd …"
        set -l max (math $cols - 19)
        test $max -lt 10; and set max 10
        test (string length -- "$cmd") -gt $max; and set cmd (string sub -l (math $max - 1) -- "$cmd")…
        set -l out \e\[90m──\e\[0m' '\e\[$L'm■'\e\[0m' '
        set -l c 0
        if test -n "$cmd"
            set out "$out"\e\[1m"$cmd"\e\[22m' '
            set c (math (string length -- "$cmd") + 1)
        end
        set -l fill (math $cols - 15 - $c)
        test $fill -lt 1; and set fill 1
        echo -n "$out"\e\[90m(string repeat -n $fill '─')" $now ──"\e\[0m
    end

    # The closing line, ── ✓ DONE · 4.2 s ─────.
    function __bureau_foot -a ok stopped code ms cols
        set -l color 91
        set -l icon error
        set -l label FAILED
        test "$__bc_lang" = es; and set label FALLO
        if test $ok = 1
            set color 32
            set icon clear
            set label DONE
            test "$__bc_lang" = es; and set label COMPLETADO
        else if test $stopped = 1
            set color 33
            set icon anomaly
            set label INTERRUPTED
            test "$__bc_lang" = es; and set label INTERRUMPIDO
        end
        set -l mark ''
        if test "$__bc_icons" != 0
            set -l var __bureau_g_$icon
            set mark "$$var "
        else if test $ok != 1
            set mark '× '
        end
        set -l dot ' · '
        set -l info ''
        if test $ok != 1; and test $stopped != 1
            if test "$__bc_lang" = es
                set info "$dot"'código '$code
            else
                set info "$dot"'code '$code
            end
        end
        set info "$info$dot"(__bureau_duration $ms)
        set -l fill (math $cols - 5 - (string length -- "$mark$label$info"))
        test $fill -lt 1; and set fill 1
        echo -n \e\[90m──\e\[0m' '\e\[1\;$color'm'"$mark$label"\e\[0m\e\[90m"$info "(string repeat -n $fill '─')\e\[0m
    end

    function __bureau_preexec --on-event fish_preexec
        set -g __bureau_framed 0
        test "$__bc_frame" != 0; or return
        contains -- "$__bc_style" signage dossier controlPoint board alertLevel; or return
        __bureau_frame_wanted "$argv[1]"; or return
        set -g __bureau_framed 1
        __bureau_head "$argv[1]" $COLUMNS (date +%H:%M)
        echo
    end

    # After each command: its result and how long it took.
    function __bureau_postexec --on-event fish_postexec
        set -l code $status
        set -g __bureau_ran 1
        set -g __bureau_code $code
        set -g __bureau_stopped 0
        if test $code = 0
            set -g __bureau_ok 1
            set -g __bureau_fails 0
        else
            set -g __bureau_ok 0
            set -g __bureau_fails (math $__bureau_fails + 1)
            test $code = 130; and set -g __bureau_stopped 1
        end
        # The closing line, if fish_preexec wrote the header (it already says how long it took).
        if test "$__bureau_framed" = 1
            set -g __bureau_framed 0
            __bureau_foot $__bureau_ok $__bureau_stopped $__bureau_code $CMD_DURATION $COLUMNS
            echo
            set -g __bureau_ran 0
        end
    end

    function __bureau_fish_prompt
        __bureau_conf
        if not contains -- "$__bc_style" signage dossier controlPoint board alertLevel
            functions -q __bureau_original_fish_prompt; and __bureau_original_fish_prompt
            return
        end
        if test $__bureau_ran = 1
            set -g __bureau_dur $CMD_DURATION
        else
            set -g __bureau_dur 0
        end
        set -g __bureau_ran 0
        __bureau_render
        set -g __bureau_transient 0
    end

    function fish_prompt
        __bureau_fish_prompt
    end

    # A prompt set later (a plugin in config.fish) takes over fish_prompt: on
    # the first prompt the Bureau one takes it back, keeping that one for style=off.
    function __bureau_take_over --on-event fish_prompt
        functions -e __bureau_take_over
        if not string match -q '*__bureau_fish_prompt*' -- (functions fish_prompt)
            functions -e __bureau_original_fish_prompt
            functions -c fish_prompt __bureau_original_fish_prompt
            function fish_prompt
                __bureau_fish_prompt
            end
        end
    end

    # Classified: when you press Enter, the prompt is redrawn with a redaction
    # bar (only if Enter still does what fish does by default).
    function __bureau_enter
        __bureau_conf
        if test "$__bc_classified" = 1; and contains -- "$__bc_style" signage dossier controlPoint board alertLevel; and commandline --is-valid
            set -g __bureau_transient 1
            commandline -f repaint
        end
        commandline -f execute
    end
    if string match -q '*execute*' -- (bind \r 2>/dev/null)
        bind \r __bureau_enter
        bind -M insert \r __bureau_enter 2>/dev/null
    end

    # Bureau colours for Git: git includes bureau.gitconfig, next to this script
    # (the extension writes in it only the colours your Git configuration does
    # not set, and nothing with them off).
    set -l gc $__bureau_dir/bureau.gitconfig
    test $__bureau_os = windows; and command -q cygpath; and set gc (cygpath -m $gc)
    set -l n 0
    string match -qr '^\d+$' -- "$GIT_CONFIG_COUNT"; and set n $GIT_CONFIG_COUNT
    set -l i 0
    while test $i -lt $n
        set -l var GIT_CONFIG_VALUE_$i
        test "$$var" = "$gc"; and break
        set i (math $i + 1)
    end
    if test $i = $n
        set -gx GIT_CONFIG_KEY_$n include.path
        set -gx GIT_CONFIG_VALUE_$n $gc
        set -gx GIT_CONFIG_COUNT (math $n + 1)
    end

    # The Board style greets you with one of its messages when the terminal opens.
    __bureau_conf
    if test "$__bc_style" = board
        set -l line "$BUREAU_BOARD_LINE"
        if test -z "$line"; and test -r $__bureau_dir/board.txt
            set -l lines (string match -v '' <$__bureau_dir/board.txt)
            test (count $lines) -gt 0; and set line $lines[(random 1 (count $lines))]
        end
        if test -n "$line"
            set line (string replace -r '^<<(.*)>>$' '$1' -- $line)
            set -l L 31
            test "$__bc_theme" = resonant; and set L 36
            test "$__bc_theme" = black; and set L 97
            set -l icon ''
            test "$__bc_icons" != 0; and set icon \e\[$L"m$__bureau_g_board"\e\[0m' '
            printf '%s\e[%sm<<\e[0m\e[1m%s\e[22m\e[%sm>>\e[0m\n\n' "$icon" $L "$line" $L
        end
    end
    set -e BUREAU_BOARD_LINE
end

# VS Code shell integration (command decorations, sticky scroll...): the Bureau
# profile starts fish with its own arguments, so VS Code does not inject it and
# it is loaded here, after the prompt, so that it wraps it.
if set -q BUREAU_VSCODE_SI; and test "$TERM_PROGRAM" = vscode; and not set -q VSCODE_SHELL_INTEGRATION; and test -r "$BUREAU_VSCODE_SI"
    source "$BUREAU_VSCODE_SI"
end
set -e BUREAU_VSCODE_SI
