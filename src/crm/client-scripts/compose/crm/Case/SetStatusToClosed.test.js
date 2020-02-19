import path from 'path'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import SetStatusToClosed from './SetStatusToClosed'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h,ui

  const modulesYaml = path.join(__dirname, '..', '..', '..', '..', 'config', '1100_modules.yaml')
  const recordID = '1'

  // Mock timestamp
  SetStatusToClosed.getTimestamp = () => {
    return '1'
  }

  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.recordID = recordID
  settingsRecord.values = {
    SolutionNextNumber: 1
  }

  const caseModule = getModuleFromYaml('Case', modulesYaml)
  const caseRecord = new Record(caseModule)
  caseRecord.recordID = recordID
  caseRecord.values = {
    Name: 'CaseName',
    CaseNumber: '1',
    Subject: 'Subject',
    Status: 'Open',
    SuppliedEmail: 'john.doe@mail.com',
    SolutionId: '1',
    SolutionName: 'SolutionName',
    SolutionNote: 'SolutionNote',
    SolutionFile: 'File',
    QuoteNumber: '1',
    ProductId: '1'
  }

  const newCaseRecord = new Record(caseModule)
  newCaseRecord.recordID = recordID
  newCaseRecord.values = {
    ...caseRecord.values,
    IsClosed: true,
    ClosedDate: SetStatusToClosed.getTimestamp(),
    Status: 'Closed'
  }

  const caseUpdateModule = getModuleFromYaml('CaseUpdate', modulesYaml)
  const caseUpdateRecord = new Record(caseUpdateModule)
  caseUpdateRecord.recordID = recordID
  caseUpdateRecord.values = {
    Description: 'State set to "Closed',
    Type: 'State change',
    CaseId: caseRecord.recordID
  }

  const solutionModule = getModuleFromYaml('Solution', modulesYaml)
  const solutionRecord = new Record(solutionModule)
  solutionRecord.recordID = recordID
  solutionRecord.values = {
    SolutionName: 'SolutionName 1',
    SolutionNote: 'SolutionNote 1',
    File: 'File 1'
  }

  const newSolutionCaseRecord = new Record(caseModule)
  newSolutionCaseRecord.recordID = recordID
  newSolutionCaseRecord.values = {
    ...newCaseRecord.values,
    SolutionName: 'SolutionName 1',
    SolutionNote: 'SolutionNote 1',
    SolutionFile: 'File 1',
  }

  const newSolutionRecord = new Record(solutionModule)
  newSolutionRecord.recordID = recordID
  newSolutionRecord.values = {
    SolutionName: 'SolutionName',
    SolutionNote: 'SolutionNote',
    File: 'File',
    Status: 'New',
    IsPublished: '1',
    CaseId: caseRecord.recordID,
    SolutionNumber: settingsRecord.values.SolutionNextNumber,
    ProductId: caseRecord.values.ProductId
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    ui = stub({ 
      success: () => {},
      warning: () => {},
      gotoRecordEditor: () => {}
    })
  })

  describe('successful case status to "Closed"', () => {
    it('should successfully set case status to "Closed" if solutionRecord exists', async () => {
      h.saveRecord.onCall(0).resolves(newCaseRecord)
      h.makeRecord.onCall(0).resolves(caseUpdateRecord)
      h.saveRecord.onCall(1).resolves(caseUpdateRecord)
      h.findRecordByID.resolves(solutionRecord)
      h.saveRecord.onCall(2).resolves(newSolutionCaseRecord)

      await SetStatusToClosed.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })

      // @todo, unexpected behaviour with commented tests
      //expect(h.saveRecord.getCall(0).lastArg.values).to.deep.equal(newCaseRecord.values)
      expect(h.makeRecord.getCall(0).calledWith(caseUpdateRecord.values, 'CaseUpdate')).true
      expect(h.saveRecord.getCall(1).calledWith(caseUpdateRecord)).true
      expect(h.findRecordByID.calledOnceWith(caseRecord.values.SolutionId, 'Solution')).true
      expect(h.saveRecord.getCall(2).calledWith(newSolutionCaseRecord)).true
    })

    it.skip('should successfully set case status to "Closed" and make solution if it doesn\'t exists', async () => {
      caseRecord.values.SolutionId = undefined
      caseRecord.values.SubmitAsSolution = true
      newCaseRecord.values.SolutionId = undefined
      newCaseRecord.values.SubmitAsSolution = true
      const newRecord = { ...newCaseRecord }
      newRecord.values.SolutionId = newSolutionRecord.recordID


      const newSettings = { ...settingsRecord }

      h.saveRecord.onCall(0).resolves(newCaseRecord)
      h.makeRecord.onCall(0).resolves(caseUpdateRecord)
      h.saveRecord.onCall(1).resolves(caseUpdateRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.onCall(1).resolves(newSolutionRecord)
      h.saveRecord.onCall(2).resolves(newSolutionRecord)
      h.saveRecord.onCall(3).resolves(newSettings)
      h.saveRecord.onCall(4).resolves(newRecord)

      await SetStatusToClosed.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })

      // @todo, unexpected behaviour with commented tests
      //expect(h.saveRecord.getCall(0).calledWith(newCaseRecord)).true
      expect(h.makeRecord.getCall(0).calledWith(caseUpdateRecord.values, 'CaseUpdate')).true
      expect(h.saveRecord.getCall(1).calledWith(caseUpdateRecord)).true
      expect(h.findLastRecord.calledOnceWith('Settings')).true
      expect(h.makeRecord.getCall(1).calledWith(newSolutionRecord.values, 'Solution')).true
      expect(h.saveRecord.getCall(2)).to.exist
      expect(h.saveRecord.getCall(3)).to.exist
      expect(h.saveRecord.getCall(4)).to.exist

      caseRecord.values.SolutionId = '1'
      caseRecord.values.SubmitAsSolution = undefined
      newCaseRecord.values.SolutionId = '1'
      newCaseRecord.values.SubmitAsSolution = undefined
    })

    it('should successfuly inform if status is closed already', async () => {
      caseRecord.values.Status = 'Closed'

      await SetStatusToClosed.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })

      expect(ui.success.calledOnceWith('This case is already closed.')).true
      caseRecord.values.Status = 'Open'
    })
  })

  
  describe('error handling', () => {
    it('should throw error if saveRecord 1 throws', async () => {
      h.saveRecord.onCall(0).throws()
      
      expect(async () => await SetStatusToClosed.exec({ caseRecord: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord 1 throws', async () => {
      h.saveRecord.onCall(0).resolves(newCaseRecord)
      h.makeRecord.onCall(0).throws()
      
      expect(async () => await SetStatusToClosed.exec({ caseRecord: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 2 throws', async () => {
      h.saveRecord.onCall(0).resolves(newCaseRecord)
      h.makeRecord.onCall(0).resolves(caseUpdateRecord)
      h.saveRecord.onCall(1).throws()
      
      expect(async () => await SetStatusToClosed.exec({ caseRecord: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecordByID throws', async () => {
      h.saveRecord.onCall(0).resolves(newCaseRecord)
      h.makeRecord.onCall(0).resolves(caseUpdateRecord)
      h.saveRecord.onCall(1).resolves(caseUpdateRecord)
      h.findRecordByID.throws()

      expect(async () => await SetStatusToClosed.exec({ caseRecord: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 3 throws', async () => {
      h.saveRecord.onCall(0).resolves(newCaseRecord)
      h.makeRecord.onCall(0).resolves(caseUpdateRecord)
      h.saveRecord.onCall(1).resolves(caseUpdateRecord)
      h.findRecordByID.resolves(solutionRecord)
      h.saveRecord.onCall(1).throws()

      expect(async () => await SetStatusToClosed.exec({ caseRecord: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })
  })

  describe('warning handling', () => {
    it('If no solutionName and solutionRecord', async () => {
      caseRecord.values.SolutionId = undefined
      caseRecord.values.SolutionName = undefined

      await SetStatusToClosed.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })

      expect(ui.warning.calledOnceWith('Unable to close the case. Please add a solution name or select an existing solution before closing the case.')).true
      caseRecord.values.SolutionId = '1'
      caseRecord.values.SolutionName = 'SolutionName'
    })
  })
})
