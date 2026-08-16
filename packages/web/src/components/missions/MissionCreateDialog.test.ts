import { describe, expect, it } from 'vitest'
import { buildMissionCreatePayload, validateMissionCreateInput } from './MissionCreateDialog'

describe('MissionCreateDialog helpers', () => {
  it('rejects empty or invalid mission names before submission', () => {
    expect(validateMissionCreateInput({ name: '   ' })).toEqual({ name: 'Mission 名称不能为空。' })
    expect(validateMissionCreateInput({ name: '../escape' })).toEqual({ name: '仅允许字母、数字、点、下划线或连字符，且以字母或数字开头。' })
    expect(validateMissionCreateInput({ name: 'bad/name' })).toEqual({ name: '仅允许字母、数字、点、下划线或连字符，且以字母或数字开头。' })
    expect(validateMissionCreateInput({ name: '-bad' })).toEqual({ name: '仅允许字母、数字、点、下划线或连字符，且以字母或数字开头。' })
  })

  it('builds a trimmed payload with every Mission creation field', () => {
    expect(buildMissionCreatePayload({
      name: '  mission-alpha  ',
      goal: '  Goal text  ',
      constraints: '  Constraint text  ',
      acceptance: '  Acceptance text  ',
    })).toEqual({
      name: 'mission-alpha',
      goal: 'Goal text',
      constraints: 'Constraint text',
      acceptance: 'Acceptance text',
    })
  })
})
