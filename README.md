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

## Update website on TU server
The website is hosted on a virtual machine provided by the TU for hosting. You get access to the virtual machine from our IT Admin Dominik.

The website is a static website located under `/home/services/thegi.cognition.tu-berlin.de`. Any subfolder there will be a new website. Currently, this tool is located at `/home/services/thegi.cognition.tu-berlin.de/automaten`.

If you want to update the website,
1. `git clone` this repository to your home directory on the virtual machine.
2. Install Python (maybe ask Dominik to install or install miniconda or micromamba).
3. Build the website from the cloned repository via (first navigate into this repository):
    ```
    cd /path/to/fsm  # this clone repo
    /path/to/python build.py --path /home/services/thegi.cognition.tu-berlin.de/automaten
    ```
    This will copy the website to the correct location and everyting should be updated. You might have to delete your browser cache if the website is not updating.

