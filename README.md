# Finite State Machine Designer (German instructions, updated interface)
This tool is hosted at https://thegi.cognition.tu-berlin.de/automaten. It is based on the original Finit State Machine Designer hosted at http://madebyevan.com/fsm/.

Changes in this version:
1. Text labels on state transition arrows can have multiple lines (Shift + Enter) and allow cursor movement with arrow keys.
2. You can add a blank symbold with `\blank`.
3. You can save and reload multiple automata.
4. German instructions.

## Build

- Generate `www/fsm.js`: `python build.py` (and copy built website to a specific path with `python build.py --path /path/to/www)
- Run locally: `python -m http.server --directory www` then open `http://localhost:8000/`
