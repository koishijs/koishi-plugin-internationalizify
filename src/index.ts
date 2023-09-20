import { Context, Schema, h } from 'koishi'
import { } from '@koishijs/translator'

export const name = 'internationalizify'

export const usage = `
## 使用说明

如果出现消息翻译上下文错位的情况（翻译后语言与用户设置不符），可以尝试调整消息栈高度来修正。
`

type StackMsg = {
  updated: number
  content: string
  target: string
}
export interface Config {
  default: string
  maxStackLength: number
}

export const Config: Schema<Config> = Schema.object({
  default: Schema.string().default('zh-CN').description('默认语言。'),
  maxStackLength: Schema.number().min(5).step(1).default(7).description('最大消息栈高度。')
})

export function apply(ctx: Context, config: Config) {
  ctx.using(['translator', 'database'], ctx => {
    let _msgStacks: StackMsg[] = []

    function addMsg(msg: StackMsg) {
      _msgStacks.unshift(msg)
      if (_msgStacks.length > config.maxStackLength) _msgStacks.pop()
    }

    ctx.on('message', async (session) => {
      const { ['timestamp']: updated, content } = session
      const { ['locales']: [target] } = await session.observeUser(['locales'])
      addMsg({ updated, content, target })
    })
    ctx.before('send', async (session) => {
      if (_msgStacks[0].content)
        session.elements = await h.transformAsync(session.elements, {
          text: async (attrs) => {
            return h.text((
              await ctx.translator.translate({
                input: attrs.content,
                target: _msgStacks[0].target
              })
            ))
          }
        }, session)
    }, true)
  })
}
