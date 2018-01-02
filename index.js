'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const plur = require('plur');
const logSymbols = require('log-symbols');
const codeFrame = require('babel-code-frame');

module.exports = function(results) {
	if (!results || !results.length) return '';

	let errorCount = 0;
	let warningCount = 0;
	let invalidOptionWarningCount = 0;

	const filesOutput = results.map(function(result, resultIndex) {

		let returnData = '';

		// Collecting Styelint configuration warnings (we need it only once, but they are listed in the file-level, this is why we are checking resultIndex)
		if (resultIndex === 0) {
			const invalidOptionWarningsOutput = result.invalidOptionWarnings.map(function(invalidOptionWarning) {
				invalidOptionWarningCount++;

				return [`  ${logSymbols.error} ${invalidOptionWarning.text}`].join('\n')
			});

			if (invalidOptionWarningsOutput.length) returnData += `  ${chalk.underline('Configuration ' + plur('warning', invalidOptionWarningCount))}\n\n${invalidOptionWarningsOutput.join('\n')}\n\n`;
		}

		// Collecting Stylesheet errors
		const fileContent = fs.readFileSync(result.source, 'utf8');

		const messagesOutput = result.warnings.map(function(warning) {
			const ruleText = warning.text.substring( 0, warning.text.indexOf( ' (' + warning.rule +  ')' ) ); // warning.rule is appended to warning.text (wrapped in parentheses). We remove it in case we need them separately.
			const ruleId = chalk.dim(`(${warning.rule})`);

			let symbol;
			if (warning.severity === 'warning') {
				symbol = logSymbols.warning;
				warningCount++
			} else if (warning.severity === 'error') {
				symbol = logSymbols.error;
				errorCount++
			}

			return [
				`  ${symbol} ${ruleText} ${ruleId}`,
				`${codeFrame(fileContent, warning.line, warning.column, { highlightCode: false })}` // TODO disable syntax error highlighting
			].join('\n')
		});

		const filename = chalk.underline(path.relative('.', result.source));

		if (messagesOutput.length) returnData += `  ${filename}\n\n${messagesOutput.join('\n\n')}`;

		return returnData;
	});

	let finalOutput = `${filesOutput.filter(s => s).join('\n\n\n')}\n\n`;

	if (invalidOptionWarningCount > 0) {
		finalOutput += `  ${chalk.blue(`${invalidOptionWarningCount} configuration ${plur('warning', invalidOptionWarningCount)}`)}\n`
	}

	if (errorCount > 0) {
		finalOutput += `  ${chalk.red(`${errorCount} ${plur('error', errorCount)}`)}\n`
	}

	if (warningCount > 0) {
		finalOutput += `  ${chalk.yellow(`${warningCount} ${plur('warning', warningCount)}`)}\n`
	}

	return (errorCount + warningCount) > 0 ? finalOutput : ''
};
