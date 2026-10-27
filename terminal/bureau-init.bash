# Bureau prompt: the Bureau terminal profile of VS Code starts bash with
# --init-file pointing here. It loads what bash would load (your ~/.bashrc, or
# your profile in a login shell, as on macOS) and then the Bureau prompt.
if [ -n "${BUREAU_LOGIN:-}" ]; then
  [ -r /etc/profile ] && . /etc/profile
  for __bureau_f in ~/.bash_profile ~/.bash_login ~/.profile; do
    if [ -r "$__bureau_f" ]; then . "$__bureau_f"; break; fi
  done
  unset __bureau_f
elif [ -r ~/.bashrc ]; then
  . ~/.bashrc
fi
unset BUREAU_LOGIN
. "${BASH_SOURCE[0]%/*}/bureau-prompt.bash"
