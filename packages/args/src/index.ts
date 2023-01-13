import { printErrors } from './errors'
import {
  defaultValue,
  help,
  Modifier,
  required,
  constraints,
} from './modifiers'
import { parseValue } from './utils'
import { boolean, OptionType } from './types'
import { printHelp } from './help'
import { flow, Status } from '@rondymesquita/flow'

export * from './modifiers'
export * from './types'
export * from './command'

export type OptionValue = string | number | boolean
export type Options = Record<string, OptionValue>
export interface Argv {
  options: Options
  params: Array<string>
  errors: Array<string>
}

export interface ArgsDefinition {
  options: OptionType[]
}

const SINGLE_DASH_REGEX = /^-(\w*)(=(.*))?$/
const DOUBLE_DASH_REGEX = /^--(\w*)(=(.*))?$/

const showErrors = (errors: string[]) => {
  printErrors(errors)
}

export const helpOption = () => {
  return boolean('help', [help('Show help message'), required(false)])
}

const checkRequired = (option: OptionType, value: OptionValue) => {
  const requiredOption = option.modifiers.find(
    (mod: Modifier) => mod.name === 'required',
  )
  const isRequired = requiredOption ? requiredOption.value : false
  const isEmpty = value === undefined || value === null
  if (isRequired && isEmpty) {
    throw new Error(`"${option.name}" is required`)
  }
}

const checkType = (option: OptionType, value: OptionValue) => {
  if (typeof value != option.type) {
    throw new Error(`"${option.name}" must be of type "${option.type}"`)
  }
}

const fillOptionsDefaultValues = (
  option: OptionType,
  argv: Argv,
  value: any,
): Options => {
  const cloneArgOptions: Options = { ...argv.options }

  if (value) {
    return cloneArgOptions
  }

  if (!argv.options[option.name]) {
    const defaultModifier: Modifier = option.modifiers.find(
      (mod: Modifier) => mod.name === 'default',
    )

    if (defaultModifier) {
      cloneArgOptions[option.name] = defaultModifier.value
    }
  }

  return cloneArgOptions
}

export const defineArgs = (definition?: ArgsDefinition) => {
  // console.log(definition)
  if (!definition) {
    return parseArgs
  }

  let errors: string[] = []
  const args = (args: string[]): Argv => {
    const argv = parseArgs(args)

    console.log(JSON.stringify(definition, null, 2))
    console.log(JSON.stringify(argv, null, 2))

    // const isHelp = option

    if (argv.options.help) {
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
        () => checkRequired(option, value),
        () => checkType(option, value),
      ])()
      const optionErrors = result
        .filter((data) => data.status === Status.FAIL)
        .map((data) => data.result)

      errors = errors.concat(optionErrors)

      // option.modifiers.forEach((modifier: any) => {
      //   const { name: modifierName, value: modifierValue } = modifier
      //   // const modifierValue = modifier[name]

      //   // const modifierValidator = constraints[modifierName]

      //   // if (modifierValidator && !modifierValidator(modifierValue, value)) {
      //   //   console.log(option.name, modifierValidator, modifierValue, value)
      //   //   errors.push(
      //   //     `"${option.name}" must satisfy "${modifierName}" contraint. Expected:"${modifierValue}". Received:"${value}".`,
      //   //   )
      //   // }
      // })
    }

    argv.errors = errors

    if (errors.length > 0) {
      showErrors(errors)
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
