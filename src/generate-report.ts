import type { Reporter } from 'vitest/reporters'
import type { TestCase, TestResult, TestResultFailed } from 'vitest/node'
import {
  type CtrfReport,
  type CtrfTestState,
  type CtrfEnvironment,
  type CtrfTest,
} from '../types/ctrf'

import * as fs from 'node:fs'
import * as path from 'node:path'

interface ReporterConfigOptions {
  outputFile?: string
  outputDir?: string
  minimal?: boolean
  testType?: string
  appName?: string | undefined
  appVersion?: string | undefined
  osPlatform?: string | undefined
  osRelease?: string | undefined
  osVersion?: string | undefined
  buildName?: string | undefined
  buildNumber?: string | undefined
  buildUrl?: string | undefined
  repositoryName?: string | undefined
  repositoryUrl?: string | undefined
  branchName?: string | undefined
  testEnvironment?: string | undefined
}

class GenerateCtrfReport implements Reporter {
  readonly ctrfReport: CtrfReport
  readonly ctrfEnvironment: CtrfEnvironment
  readonly reporterConfigOptions: ReporterConfigOptions
  readonly reporterName = 'vitest-ctrf-json-reporter'
  readonly defaultOutputFile = 'ctrf-report.json'
  readonly defaultOutputDir = 'ctrf'

  filename = this.defaultOutputFile

  constructor(reporterOptions: ReporterConfigOptions) {
    this.reporterConfigOptions = {
      outputFile: reporterOptions?.outputFile ?? this.defaultOutputFile,
      outputDir: reporterOptions?.outputDir ?? this.defaultOutputDir,
      minimal: reporterOptions?.minimal ?? false,
      testType: reporterOptions.testType ?? 'unit',
      appName: reporterOptions?.appName ?? undefined,
      appVersion: reporterOptions?.appVersion ?? undefined,
      osPlatform: reporterOptions?.osPlatform ?? undefined,
      osRelease: reporterOptions?.osRelease ?? undefined,
      osVersion: reporterOptions?.osVersion ?? undefined,
      buildName: reporterOptions?.buildName ?? undefined,
      buildNumber: reporterOptions?.buildNumber ?? undefined,
      buildUrl: reporterOptions?.buildUrl ?? undefined,
      repositoryName: reporterOptions?.repositoryName ?? undefined,
      repositoryUrl: reporterOptions?.repositoryUrl ?? undefined,
      branchName: reporterOptions?.branchName ?? undefined,
      testEnvironment: reporterOptions?.testEnvironment ?? undefined,
    }

    this.ctrfReport = {
      results: {
        tool: {
          name: 'vitest',
        },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          pending: 0,
          skipped: 0,
          other: 0,
          start: 0,
          stop: 0,
        },
        tests: [],
      },
    }

    this.ctrfEnvironment = {}

    if (this.reporterConfigOptions?.outputFile !== undefined)
      this.setFilename(this.reporterConfigOptions.outputFile)

    if (
      !fs.existsSync(
        this.reporterConfigOptions.outputDir ?? this.defaultOutputDir
      )
    ) {
      fs.mkdirSync(
        this.reporterConfigOptions.outputDir ?? this.defaultOutputDir,
        { recursive: true }
      )
    }
  }

  onTestRunStart(): void {
    this.ctrfReport.results.summary.start = Date.now()
    this.setEnvironmentDetails(this.reporterConfigOptions ?? {})
    if (this.hasEnvironmentDetails(this.ctrfEnvironment)) {
      this.ctrfReport.results.environment = this.ctrfEnvironment
    }
  }

  onTestCaseResult(testCase: TestCase): void {
    this.updateCtrfTestResultsFromTestResult(testCase)
    this.updateTotalsFromTestResult(testCase)
  }

  onTestRunEnd(): void {
    this.ctrfReport.results.summary.stop = Date.now()
    this.writeReportToFile(this.ctrfReport)
  }

  private setFilename(filename: string): void {
    if (filename.endsWith('.json')) {
      this.filename = filename
    } else {
      this.filename = `${filename}.json`
    }
  }

  private updateCtrfTestResultsFromTestResult(testCase: TestCase): void {
    const test: CtrfTest = {
      name: testCase.fullName,
      duration: testCase.diagnostic()?.duration ?? 0,
      status: this.mapStatus(testCase.result()),
    }

    if (this.reporterConfigOptions.minimal === false) {
      test.message = this.extractFailureDetails(testCase).message
      test.trace = this.extractFailureDetails(testCase).trace
      test.rawStatus = testCase.result().state
      test.type = this.reporterConfigOptions.testType ?? 'unit'
      test.filePath = testCase.module.moduleId
      test.retries = testCase.diagnostic()?.retryCount ?? 0
      test.flaky = testCase.diagnostic()?.flaky || false
      test.suite = testCase.fullName
    }

    this.ctrfReport.results.tests.push(test)
  }

  extractFailureDetails(testCase: TestCase): Partial<CtrfTest> {
    const testResult = testCase.result()
    if (isTestFailed(testResult)) {
      const failureDetails: Partial<CtrfTest> = {}
      failureDetails.message = testResult.errors
        .map((error) => error.message)
        .join('\n')
      failureDetails.trace = testResult.errors
        .map((error) => error.stack)
        .filter(Boolean)
        .join('\n\n')
      return failureDetails
    }
    return {}
  }

  private updateTotalsFromTestResult(testCase: TestCase): void {
    const ctrfStatus = this.mapStatus(testCase.result())
    this.ctrfReport.results.summary[ctrfStatus]++
    this.ctrfReport.results.summary.tests++
  }

  private mapStatus(vitestResult: TestResult): CtrfTestState {
    switch (vitestResult.state) {
      case 'passed':
        return 'passed'
      case 'failed':
        return 'failed'
      case 'skipped':
        return 'skipped'
      case 'pending':
        return 'pending'
      default:
        return 'other'
    }
  }

  setEnvironmentDetails(reporterConfigOptions: ReporterConfigOptions): void {
    if (reporterConfigOptions.appName !== undefined) {
      this.ctrfEnvironment.appName = reporterConfigOptions.appName
    }
    if (reporterConfigOptions.appVersion !== undefined) {
      this.ctrfEnvironment.appVersion = reporterConfigOptions.appVersion
    }
    if (reporterConfigOptions.osPlatform !== undefined) {
      this.ctrfEnvironment.osPlatform = reporterConfigOptions.osPlatform
    }
    if (reporterConfigOptions.osRelease !== undefined) {
      this.ctrfEnvironment.osRelease = reporterConfigOptions.osRelease
    }
    if (reporterConfigOptions.osVersion !== undefined) {
      this.ctrfEnvironment.osVersion = reporterConfigOptions.osVersion
    }
    if (reporterConfigOptions.buildName !== undefined) {
      this.ctrfEnvironment.buildName = reporterConfigOptions.buildName
    }
    if (reporterConfigOptions.buildNumber !== undefined) {
      this.ctrfEnvironment.buildNumber = reporterConfigOptions.buildNumber
    }
    if (reporterConfigOptions.buildUrl !== undefined) {
      this.ctrfEnvironment.buildUrl = reporterConfigOptions.buildUrl
    }
    if (reporterConfigOptions.repositoryName !== undefined) {
      this.ctrfEnvironment.repositoryName = reporterConfigOptions.repositoryName
    }
    if (reporterConfigOptions.repositoryUrl !== undefined) {
      this.ctrfEnvironment.repositoryUrl = reporterConfigOptions.repositoryUrl
    }
    if (reporterConfigOptions.branchName !== undefined) {
      this.ctrfEnvironment.branchName = reporterConfigOptions.branchName
    }
    if (reporterConfigOptions.testEnvironment !== undefined) {
      this.ctrfEnvironment.testEnvironment =
        reporterConfigOptions.testEnvironment
    }
  }

  hasEnvironmentDetails(environment: CtrfEnvironment): boolean {
    return Object.keys(environment).length > 0
  }

  private writeReportToFile(data: CtrfReport): void {
    const filePath = path.join(
      this.reporterConfigOptions.outputDir ?? this.defaultOutputDir,
      this.filename
    )
    const str = JSON.stringify(data, null, 2)
    try {
      fs.writeFileSync(filePath, str + '\n')
      console.log(
        `${this.reporterName}: successfully written ctrf json to %s/%s`,
        this.reporterConfigOptions.outputDir,
        this.filename
      )
    } catch (error) {
      console.error(`Error writing ctrf json report:, ${String(error)}`)
    }
  }
}

function isTestFailed(result: TestResult): result is TestResultFailed {
  return result.state === 'failed'
}

export default GenerateCtrfReport
