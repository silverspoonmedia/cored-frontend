import $ from 'jquery'
import select2 from 'select2'

select2($)

window.jQuery = window.$ = $

// Select2 4.1.0 bug: Array.prototype.map(AjaxAdapter.prototype._normalizeItem)
// passes _normalizeItem without binding `this`. In strict ES module mode (Vite),
// `this` is undefined, so `this.container` throws TypeError. jQuery 4's
// Deferred swallows the exception, leaving AJAX Select2 stuck on "Searching...".
// Guard: when `this` is undefined, skip _resultId generation (not needed for
// AJAX results that get re-normalized during render).
const SelectAdapter = ($.fn.select2 as any).amd?.require?.('select2/data/select')
if (SelectAdapter?.prototype?._normalizeItem) {
  const origNormalize = SelectAdapter.prototype._normalizeItem
  SelectAdapter.prototype._normalizeItem = function (this: unknown, item: any) {
    if (this == null) {
      // Strict-mode map callback: normalize without container-dependent _resultId
      if (item !== Object(item)) {
        item = { id: item, text: item }
      }
      item = $.extend({}, { text: '' }, item)
      if (item.id != null) item.id = item.id.toString()
      if (item.text != null) item.text = item.text.toString()
      if (item.children) {
        item.children = item.children.map(
          (c: any) => SelectAdapter.prototype._normalizeItem.call(null, c),
        )
      }
      return $.extend({}, { selected: false, disabled: false }, item)
    }
    return origNormalize.call(this, item)
  }
}

export default $
