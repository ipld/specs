const path = require('path')
const fs = require('fs').promises

const defaultRedirect = 'https://ipld.io/specs/'

const redirects = [
  ['/block-layer/codecs/index.html', 'https://ipld.io/specs/codecs/'],
  ['/block-layer/codecs/dag-cbor.html', 'https://ipld.io/specs/codecs/dag-cbor/'],
  ['/block-layer/codecs/dag-json.html', 'https://ipld.io/specs/codecs/dag-json/'],
  ['/block-layer/codecs/dag-jose.html', 'https://ipld.io/specs/codecs/dag-jose/'],
  ['/block-layer/codecs/dag-pb.html', 'https://ipld.io/specs/codecs/dag-pb/'],
  ['/block-layer/content-addressable-archives.html', 'https://ipld.io/specs/transport/car/'],
  ['/block-layer/graphsync/known_extensions.html', 'https://ipld.io/specs/transport/graphsync/known_extensions/'],
  ['/block-layer/graphsync/graphsync.html', 'https://ipld.io/specs/transport/graphsync/'],
  ['/concepts/type-theory-glossary.html', 'https://ipld.io/design/concepts/type-theory-glossary/'],
  ['/data-model-layer/pathing.html', 'https://ipld.io/docs/data-model/pathing/'],
  [/^\/data-structures\/ethereum/, '/data-structures/ethereum/'],
  [/^\/data-structures\/filecoin/, 'https://github.com/ipld/ipld/tree/master/_legacy/specs/data-structures/filecoin'],
  ['/data-structures/flexible-byte-layout.html', 'https://ipld.io/specs/advanced-data-layouts/fbl/'],
  ['/data-structures/hashmap.html', 'https://ipld.io/specs/advanced-data-layouts/hamt/'],
  [/^\/design\/history\/exploration-reports/, 'https://github.com/ipld/ipld/tree/master/notebook/exploration-reports'],
  [/^\/design\//, 'https://ipld.io/design/'],
  ['/design/libraries/nodes-and-kinds.html', 'https://ipld.io/design/libraries/nodes-and-kinds/'],
  [/^\/schemas\//, 'https://ipld.io/docs/schemas/'],
  [/^\/selectors\//, 'https://ipld.io/specs/selectors/']
]

module.exports = (options = {}, context) => ({
  generated: async (paths) => {
    const redirectTemplate = await fs.readFile(path.join(__dirname, 'redirect_template.html'), 'utf8')
    const queue = []

    for (const pathAbs of paths) {
      const pathRel = pathAbs.replace(path.join(__dirname, 'dist'), '')
      let redir = defaultRedirect
      for (const [from, to] of redirects) {
        if (typeof from === 'string' && pathRel.startsWith(from)) {
          redir = to
          break
        } else if (from instanceof RegExp && from.test(pathRel)) {
          redir = to
          break
        }
      }
      redirPage = redirectTemplate.replace(/\{\{redirectUrl\}\}/g, redir)
      queue.push(fs.writeFile(pathAbs, redirPage, 'utf8'))
    }

    await Promise.all(queue)
  }
})
