export function DelArrayIndx(target: any[], node: any) {
    const index = target.indexOf(node)
    if (index !== -1) {
        target.splice(index, 1)
    }
}

export const sort = function(arr: any[]) {
    const sort = arr.sort;
    return arr === Array.prototype || arr instanceof Array && sort === Array.prototype.sort ? Array.prototype.sort : sort
}

export function arrUnique(arr: any[]) {
    let res: any[] = [];
    arr.forEach((a)=>{
        -1 === res.indexOf(a) && res.push(a)
    })
    return res
}