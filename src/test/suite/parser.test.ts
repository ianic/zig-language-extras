import * as assert from 'assert';
import * as fs from 'fs';
import { Parser } from '../../parser';
import * as glob from 'glob';

const writeExpected = false;

suite('Parsing Zig command output', () => {

    test('test cases from testdata folder', () => {
        const testdataRoot = __dirname.replace('/out/', '/src/') + '/testdata/';
        // find all *.txt in testdata
        glob('**/**.txt', { cwd: testdataRoot }, (err, files) => {
            if (err) {
                // TODO
            }
            files.forEach(file => {
                // find expected file for output
                const data = fs.readFileSync(testdataRoot + file, 'utf-8');
                const expectedFileName = testdataRoot + file + "_expected.json";

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
                        });
                    }
                    expected.forEach((e: any, i: number) => {
                        test("problem " + (i + 1) + " matches expected ", () => {
                            const p = parser.problems[i];
                            assert.equal(e.file, p.file);
                            assert.equal(e.line, p.line);
                            assert.equal(e.column, p.column);
                            assert.equal(e.message, p.message);
                            assert.equal(e.severity, p.severity);
                        });
                    });
                });
            });
        });
    });
});





