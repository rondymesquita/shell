import { printErrors } from './errors'
import {
  Modifier,
  ValidatorModifier,
  ConfigModifier,
  ModifierType,
} from './modifiers'
import { parseValue } from './utils'
import { boolean, Option } from './types'
import { printHelp } from './help'
import { Context, flow, Status } from '@rondymesquita/flow'
import { checkType, checkValue } from './argcheck'

export * from './modifiers'
export * from './types'
export * from './command'
export * from './options'
export * from './help'

export type OptionValue = string | number | boolean
export type Options = Record<string, OptionValue>
export interface Argv {
  options: Options
  params: Array<string>
  errors: Array<string>
}

export interface ArgsDefinition {
  name?: string
  usage?: (name: string) => string
  options: Option[]
}

const SINGLE_DASH_REGEX = /^-(\w*)(=(.*))?$/
const DOUBLE_DASH_REGEX = /^--(\w*)(=(.*))?$/
const fillOptionsDefaultValues = (
  option: Option,
  argv: Argv,
  value: any,
): Options => {
  const cloneArgOptions: Options = { ...argv.options }

  if (value) {
    return cloneArgOptions
  }

  if (!argv.options[option.name]) {
    const defaultModifier: ConfigModifier | undefined = option.modifiers.find(
      (mod: Modifier) => mod.name === 'defaultvalue',
    ) as ConfigModifier

    if (defaultModifier) {
      cloneArgOptions[option.name] = defaultModifier.value
    }
  }

  return cloneArgOptions
}

type Handler<T, U> = (value: T, argValue: U) => boolean

export function defineValidator<T, U>(name: string, handler: Handler<T, U>) {
  return (value: T): ValidatorModifier<U> => {
    return {
      name,
      value,
      type: ModifierType.VALIDATOR,
      validate: <V extends U>(argValue: V) => handler(value, argValue),
    }
  }
}

export const defineArgs = (definition?: ArgsDefinition) => {
  if (!definition) {
    return parseArgs
  }

  let errors: string[] = []
  const args = (args: string[]): Argv => {
    const argv = parseArgs(args)

    const isHelp = definition.options.find((option) => {
      return option.modifiers.find((mod) => {
        return mod.name === 'showhelp'
      })
    })

    if (argv.options[isHelp?.name!]) {
      printHelp(definition)
      return argv
    }

    for (let index = 0; index < definition.options.length; index++) {
      const option = definition.options[index]
      const value = argv.options[option.name]
      argv.options = fillOptionsDefaultValues(option, argv, value)
    }

    for (let index = 0; index < definition.options.length; index++) {
      const option = definition.options[index]
      const value = argv.options[option.name]

      const result = flow([
        () => checkValue(option, value),
        () => checkType(option, value),
      ])()
      const optionErrors = result
        .filter((data) => data.status === Status.FAIL)
        .map((data) => data.result)

      errors = errors.concat(optionErrors)

      const validators = option.modifiers.filter(
        (mod: Modifier) => mod.type === ModifierType.VALIDATOR,
      )
      validators.forEach((modifier: Modifier) => {
        if (!(modifier as ValidatorModifier<any>).validate(value)) {
          errors.push(
            `"${option.name}" must satisfy "${modifier.name}" contraint. Expected:"${modifier.value}". Received:"${value}".`,
          )
        }
      })
    }

    argv.errors = errors

    if (errors.length > 0) {
      printErrors(errors)
      printHelp(definition)
    }

    return argv
  }

  return args
}

export const parseArgs = (args: string[]): Argv => {
  const options: Options = {}
  const params: Array<string> = []

  args.map((arg: string) => {
    const regex = [SINGLE_DASH_REGEX, DOUBLE_DASH_REGEX].find((regex) => {
      return !!arg.match(regex)
    })

    const regexResult = arg.match(regex!)

    if (regexResult![0]) {
      const key = regexResult![1]
      const value = regexResult![3]
      options[key] = parseValue(value)
      return
    }

    params.push(arg)
  })

  return { options, params, errors: [] }
}
