import GetStats from './GetStats'
import { ObjectInherit } from '../../util/utils'

export const LowVersionBrowserStats = (function (a): any {
    function b() {
        // @ts-ignore
        return (null !== a && a.apply(this, arguments)) || this
    }
    return (
        ObjectInherit(b, a),
        (b.prototype.updateStats = function () {
            return Promise.resolve()
        }),
        b
    )
})(GetStats)
