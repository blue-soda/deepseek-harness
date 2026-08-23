# @deepseek-ai/dsh-attachment-android

DeepSeek Harness 的 Android 嵌入式附件后端。它在不依赖 `sharp`/libvips 的情况下挂载 `ctx.attachments`，并把 PNG、JPEG、WebP 图片作为经过校验的内容寻址对象存放在 `DSH_HOME` 下。

该后端面向嵌入 Android runtime：原生图片处理包在这里要么不可用，要么体积过大。它会校验图片头、尺寸和引用完整性，保存原始编码字节；当图片本身已经满足模型路由预算时，直接作为 model-request image 返回。超过请求预算的投影会以 `IMAGE_TOO_LARGE` 失败关闭；后续可以在不改变 DSH attachment API 的前提下，把 Android/Kotlin 侧 resize 接到这个包后面。
