declare const Zotero: any
declare const Components: any

const marker = 'OnenotePluginMonkeyPatched'

function patch(object, method, patcher) {
  if (object[method][marker]) return
  object[method] = patcher(object[method])
  object[method][marker] = true
}

function matchAll(re: RegExp, str: string, group: number): string[] {
  const result = []
  let match: RegExpExecArray
  while((match = re.exec(str)) !== null) {
    result.push(match[group])
  }
  return result
}

function replaceAll(str: string, from: string, to: string) {
  while(str.indexOf(from)!==-1) {
    str = str.replace(from, to)
  }
  return str
}

const OnenotePlugin = Zotero.OnenotePlugin || new class { // tslint:disable-line:variable-name
  private initialized: boolean = false

  constructor() {
    window.addEventListener('load', event => {
      this.init().catch(err => Zotero.logError(err))
    }, false)
  }

  public async getOnenoteView() {
    const selections: any[] = Zotero.getActiveZoteroPane().getSelectedItems()
    if (selections.length !== 1) return
    const item = selections[0]
    if (!item || item.isNote() || !item.isRegularItem()) return
    const notes: any[] = item.getNotes()
    const ahref = /<a href="([^"]*)">/g
    let onenote_url: string = null
    /** Onenote link validation:
     *  "Copy link" a onenote page will fill the clipboard with two links,
     *  first for local Onenote app and second for the web app. It will be
     *  shown as "Section name - page name (Web view)".
     *  If pasted directly into a Zotero note, it will have the form:
     *  <p><a href="first link">...</a>...<a href="second link"...>...</p>
     *  ... where the first link is of the form "onenote:https://..."
     *  so we can validate the proper pasted result.
     */
    for(const id of notes) {
      const note:string = Zotero.Items.get(id).getNote()
      const matches: string[] = matchAll(ahref, note, 1)
      if (matches.length === 2
          && matches[0].startsWith('onenote:https://')) {
        onenote_url = replaceAll(matches[1].trim(), '&amp;', '&')
      }
    }

    // get the pane defined in overlay.xul
    const iframe = document.getElementById('zotero-onenote-box') as HTMLIFrameElement
    if (!iframe) return
    if (onenote_url === null) {
      iframe.src = ''
      // iframe.contentDocument.documentElement.innerHTML = 'To activate Onenote view, add an Onenote link to the notes.'
    } else if (onenote_url !== iframe.src) {
      iframe.src = ''
      iframe.src = onenote_url
    }
  }

  private async init() {
    if (this.initialized) return
    this.initialized = true
    const plugin = this
    document.addEventListener('select', () => {
      plugin.getOnenoteView().catch(err => Zotero.logError(err))
    })
  }

}

export = OnenotePlugin

// otherwise this entry point won't be reloaded: https://github.com/webpack/webpack/issues/156
delete require.cache[module.id]
