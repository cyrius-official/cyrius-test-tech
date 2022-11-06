module.exports = {
  "all": true,                        //	Whether or not to instrument all files (not just the ones touched by your test suite)	Boolean	false
  "check-coverage": true,           //	Check whether coverage is within thresholds, fail if not	Boolean	false
  "extension": [".js", ".ts"],        //	List of extensions that nyc should attempt to handle in addition to .js	Array<String>	['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx']
  "include": ["src/**"],              // See selecting files for coverage for more info	Array<String>	['**']
// exclude	See selecting files for coverage for more info	Array<String>	list
  "reporter": ["lcov", "text"],	// May be set to a built-in coverage reporter or an npm package (dev)dependency	Array<String>	['text']
  // "report-dir": "reports/coverage", //	Where to put the coverage report files	String	./coverage
// skip-full	Don't show files with 100% statement, branch, and function coverage	Boolean	false
// temp-dir	Directory to output raw coverage information to	String	./.nyc_output

  "branches": 100,
  "lines": 100,
  "functions": 100,
  "statements": 100,
  "watermarks": {
    "lines": [80, 100],
    "functions": [80, 100],
    "branches": [80, 100],
    "statements": [80, 100],
  }
}
