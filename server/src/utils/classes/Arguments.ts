import {ArgumentOptions, ArgumentParser} from "argparse";


export class Arguments {
    dataPath: string = './';
    settingsPath: string = './';
    private _parser: ArgumentParser;
    constructor(args: [string, ArgumentOptions][] = []) {
        this._parser = new ArgumentParser()
        this._parser.add_argument('--data-path', {metavar: 'PATH', default: this.dataPath, dest: 'dataPath'})
        this._parser.add_argument('--settings-path', {metavar: 'PATH', default: this.settingsPath, dest: 'settingsPath'})
        for (let [arg, options] of args) {
            this._parser.add_argument(arg, options);
        }

        this.parse()
    }

    parse() {
        const args = this._parser.parse_args()
        for (const arg of Object.keys(args)) {
            // @ts-ignore
            this[arg] = args[arg];
        }
    }
}