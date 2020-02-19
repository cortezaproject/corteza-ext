import path from 'path'
import { describe, it } from 'mocha'
import { expect } from 'chai'
import SetValues from './SetValues'
import { compose } from '@cortezaproject/corteza-js'
const { Record, getModuleFromYaml } = compose

describe(__filename, () => {
  const modulesYaml = path.join(__dirname, '../../../', 'config', '1100_modules.yaml')
  const departmentModule = getModuleFromYaml('Department', modulesYaml)
  const departmentRecord = new Record(departmentModule)
  departmentRecord.values = {
    Name: 'John'
  }

  describe('successful setting of department values', () => {
    it('should sucessfully set values of a department', async () => {
      const record = await SetValues.exec({ $record: departmentRecord })
      expect(record.values.DepartmentSelect).equal('John')
    })
  })
})
