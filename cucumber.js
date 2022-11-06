module.exports = {
  default: {
    require: ["features/support/**/*.ts"],
    publishQuiet: true,
    requireModule: ["ts-node/register"],
    format: [
      "html:reports/cucumber.html",
      "@cucumber/pretty-formatter",
    ],
  }
}