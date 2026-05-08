## 在父页面中调用子页面的方法

```ts
import { connectToChild } from "@ali/penpal-connect/parent";

connectToChild({
  // todo
});
```

## 在子页面中调用父页面的方法
```ts
import { connectToParent } from "@ali/penpal-connect/child";
connectToParent({
  // todo
});
```