import * as assert from 'assert';
import * as fs from 'fs';
import { Parser } from '../../parser';
import * as glob from 'glob';
import * as path from 'path';

const testdataRoot = path.join(__dirname.replace(path.sep + 'out' + path.sep, path.sep + 'src' + path.sep), 'testdata');
const writeExpected = false;

function readTestCase(file: string) {
    return fs.readFileSync(path.join(testdataRoot, file), 'utf-8');
}

suite('Parsing Zig command output', () => {

    test('test cases from testdata folder', () => {
        // find all *.txt in testdata
        glob('**/**.txt', { cwd: testdataRoot }, (err, files) => {
            if (err) {
                console.error("error", err);
                throw err;
            }
            files.forEach(file => {
                // find expected file for output
                const data = readTestCase(file);
                const expectedFileName = path.join(testdataRoot, file + "_expected.json");

                // parse
                const parser = new Parser("/project/root", data);

                if (writeExpected) { // used while creating expected files
                    const actual = JSON.stringify(parser.problems, null, 2);
                    fs.writeFileSync(expectedFileName, actual);
                    return;
                }

                // parser output should match saved expected file
                suite(file, () => {
                    const expected = JSON.parse(fs.readFileSync(expectedFileName, 'utf-8'));
                    if (expected.length === 0) {
                        test("no problems", () => {
                            assert.equal(0, parser.problems.length);
                            assert.equal(0, parser.problemsCount());
                        });
                    }
                    assert.equal(expected.length, parser.problemsCount());
                    expected.forEach((e: any, i: number) => {
                        test((i + 1) + " " + e.message.replace("\n", " "), () => {
                            const p = parser.problems[i];
                            assert.equal(p.file, e.file);
                            assert.equal(p.line, e.line);
                            assert.equal(p.column, e.column);
                            assert.equal(p.message, e.message);
                            assert.equal(p.severity, e.severity);
                        });
                    });
                });
            });
        });
    });

    test("group problems by file", () => {
        const data = readTestCase("assert_failed_in_test.txt");
        const parser = new Parser("", data);

        assert.equal(8, parser.problemsCount());
        const map = parser.groupByFile();
        const keys = Object.keys(map);

        assert.equal(3, keys.length);
        assert.equal(6, map[keys[0]].length);
        assert.equal(1, map[keys[1]].length);
        assert.equal(1, map[keys[2]].length);
    });
});





