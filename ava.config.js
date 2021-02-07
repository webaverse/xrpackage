export default {
    failFast: false,
    verbose: true,
    environmentVariables: {
        STATIC_URL: "http://localhost:{port}/tests/static",
    },
    files: [
        "tests/*.js",
        "!tests/static/*",
        "!tests/utils/*",
    ]
}
