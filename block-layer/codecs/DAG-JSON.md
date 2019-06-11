# Specification: DAG-JSON

**Status: Descriptive - Final**

DAG-JSON supports the full [IPLD Data Model](../data-model-layer/data-model.md).

## Format

### Simple Types

All simple types except binary are supported natively by JSON.

Contrary to popular belief, JSON as a format supports Big Integers. It's only
JavaScript itself that has trouble with them. This means JS implementations
of `dag-json` can't use the native JSON parser and serializer.

### Version 0

This is an old version of `dag-json` that reserved the `"/"` key in order to
represent binary and link data types.

#### Binary Type

```javascript
{"/": { "base64": String }}
```

#### Link Type

```javascript
{"/": String /* base encoded CID */}
```

### Version 1

#### Format

The internal data format is valid JSON but is **NOT** identical to the decoded
node data codecs produce.

Example internal format:

```javascript
{ "/": { "_": 1 },
  "data": { "hello": "world", { "obj": { "array": [0, 0] } } },
  "meta": {
    base64: [
      [[ "key" ], "dmFsdWU="],
      [[ "obj", "key"], "dmFsdWU="],
      [[ "obj", "array", 0], "dmFsdWU="]
    ],
    links: [
      [["obj", "array", 1], "zb2rhe5P4gXftAwvA4eXQ5HJwsER2owDyS9sKaQRRVQPn93bA"]
    ]
  }
}
```

Decodes to:

```javascript
{ hello: 'world',
  key: Buffer.from('value'),
  obj: {
    array: [ Buffer.from('value'), new CID('zb2rhe5P4gXftAwvA4eXQ5HJwsER2owDyS9sKaQRRVQPn93bA')],
    key: Buffer.from('value')
  }
}
```
