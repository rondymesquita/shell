# flow

Simply execute functions in sequence.

- Easy exception handling
- Improve code readability

```js
const { run } = flow([() => 1, () => 2])

const results = run()
// [
// 	{
// 		data: 1,
// 		status: 'OK',
// 	},
// 	{
// 		data: 2,
// 		status: 'OK',
// 	},
// ]
```

### Stop execution

Simply make stage thrown an exception.

```js
const { run } = flow([
  () => {
    throw new Error('sample error')
  },
  () => {
    return 'This stage will no be executed'
  },
])

const results = run()
// [
//   {
//     data: 'sample error',
//     status: 'FAIL',
//   }
// ]
```

### Keep executing even with exception

Pass `stopOnError` option to `run` function.

```js
const { run } = flow([
  () => {
    throw new Error('error')
  },
  () => 'this will be executed normally',
])

const results = run([stopOnError(false)])
// {
//   data: 'error',
//   status: 'FAIL',
// },
// {
//   data: 'this will be executed normally',
//   status: 'OK',
// },
```

### Get all results or errors

```js
const { run } = flow([
  () => {
    throw new Error('error')
  },
  () => 'this will be executed normally',
])

const results = run([stopOnError(false)])

const successes = results.filter((result) => result.status === Status.OK)
const errors = results.filter((result) => result.status === Status.FAIL)
```

### Context

Share data between stages.

```js
const { run } = flow([
  (ctx) => {
    ctx.set('color', 'red')
  },
  (ctx) => {
    ctx.get('color') // red
    ctx.set('mode', 'dark')
  },
  (ctx) => {
    ctx.get('color') // red
    ctx.get('mode') // dark
  },
])

const results = run()
```

Inject data in context before running.

```js
const { run, context } = flow([
  (ctx: Context) => {
    ctx.get('mode') // light
  },
])

context.set('mode', 'light')
const results = run()
```

### Provide custom arguments

Inject data on stages.

```js
const { run, provideArgs } = flow([
  (pirate, ctx) => {
    // pirate.name is 'Jack Sparrow'
  },
])
provideArgs((ctx: Context) => {
  const pirate = { name: 'Jack Sparrow' }
  return [pirate, ctx]
})
const results = run()
```

### Promises

If any stage resolves to a promise, use `runAsync`.

```js
const { runAsync } = flow([
  async () => {
    await fetch()
  },
  () => {
    return Promise.resolve()
  },
  () => {
    return new Promise(...)
  },
])

const results = await runAsync()
```
