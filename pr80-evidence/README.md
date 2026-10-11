# Evidence for the sidebar search box

Pull request: https://github.com/Edfghdrtxxx/Physics-GRE-Practice/pull/80

Everything here was produced from commit `b7997e2` of the branch `fm/pgre-sidebar-search`, in an isolated Chrome profile, with the public data only. The pull request description names what each image shows.

| File | What it is |
|---|---|
| `01` to `10` `.png` | Screenshots written by `tools/test-sidebar-search-chrome.js` (address `http://127.0.0.1:<port>`) |
| `00`, `11`, `12`, `13` `.png` | Screenshots taken by hand on the `file://` address |
| `test-sidebar-search.log` | Output of `node tools/test-sidebar-search-chrome.js` |
| `file-origin-check.js`, `.log` | The main path on the `file://` address |
| `manual-shortcut-off.js`, `.log` | Four places where the shortcut must do nothing |
| `manual-sealed-drill.js`, `.log` | A sample-exam question in the box before, during and after a mistake drill |
| `manual-checks.js`, `.log` | Print rules, and speed with 3,000 synthetic questions, on both addresses |
| `manual-pointer-click.log` | Clicks made with a real pointer |
| `existing-node-tests.log`, `existing-chrome-tests.log` | Every existing test tool of the project |

The `.js` files here run with `chrome-devtools-axi run < file.js`. Local paths in the scripts and logs are replaced by `<worktree>`, `<scratch>`, `<task-data>` and `<tmp>`.
