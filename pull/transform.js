const debug = require('debug')('Commander:Pull:Transform');
const path = require('path');

function splitKey(key) {
  return key.split('.');
}

function transform(pathChain, module, isIndex) {
  return {
    name: isIndex ? path.join(...pathChain, 'index') : path.join(...pathChain),
    module: module.replace(/require\s*\(\s*['"](.+)['"]\s*\)/g, (match, reqPath) => {
      let reqChain = reqPath.split('.');
      debug('pathChain', pathChain);
      debug('reqChain', reqChain);
      if (pathChain.length === 1) {
        reqChain.unshift('.');
      } else {
        let tree = [];
        let found = false;
        let index = 0;
        for (let i = 0; i < reqChain; ++i) {
          if (found) { tree.push('..'); }
          else if (reqChain[i] === pathChain[i]) {
            found = true;
            index = i;
          }
        }
        debug('tree', tree);
        debug('found', found);
        debug('index', index);
        if (found) {
          tree = tree.concat(pathChain.slice(index));
        } else {
          tree = pathChain.map(() => '..').concat(reqChain);
        }
        reqChain = tree;
      }
      debug(reqChain);
      let output = path.join(...reqChain);
      if (output[0] !== '.') { output = './' + output; }
      return `require('${output}')`;
    })
  };
}

module.exports = function (params, modules) {
  const m = Object.keys(modules)
    .map(key => {
      return { key, pathChain: splitKey(key), module: modules[key] };
    })
    .filter(data => !!data.module);
  m.sort((m1, m2) => {
    if (m1.key > m2.key) { return 1; }
    if (m1.key < m2.key) { return -1; }
    return 0;
  });
  return m.map((data, index, arr) => {
    let isIndex = index < arr.length - 1 && arr[index].key === arr[index + 1].key.substr(0, arr[index].key.length);
    return transform(data.pathChain, data.module, isIndex);
  })
    .reduce((obj, module) => {
      obj[module.name] = module.module;
      return obj;
    }, {});
};
