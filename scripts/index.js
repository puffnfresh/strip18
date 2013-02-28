window.addEventListener("DOMContentLoaded", function () {
    var parser = new Parser();
    var evaluator = new Evaluator();

    var repl = new CodeMirrorREPL("repl", {
        mode: "custom",
        theme: "eclipse"
    });

    repl.print('STRIP-18', 'message title');
    repl.print('An entry into PLT Games, February 2013', 'message');
    repl.print('');
    repl.print('I am the Great Mage of Undecimal.', 'message');
    repl.print('I have stripped you of 18 magical powers.', 'message');
    repl.print('You are left with the humble power of natural number literals.', 'message');
    repl.print('Prove to me you are capable of using them.', 'message');

    window.print = function (message) {
        repl.print(message, "message");
    };

    function printQuestion() {
        repl.print('');
        return repl.print(evaluator.question(), 'title');
    }

    printQuestion();
    repl['eval'] = function (code) {
        var result = parser.parse(code), ast, evaluated;
        if(result.isEmpty || result.val.isFailure) {
            repl.print("Didn't parse!", 'error');
            repl.print('');
            return;
        }
        ast = result.val.val;
        try {
            evaluated = evaluator.evaluate(ast);
            repl.print(evaluated.value, evaluated.correct ? 'result' : 'error');
            if(evaluated.message) {
                repl.print('');
                repl.print(evaluated.message, 'message');
            }
        } catch(error) {
            repl.print(error.message, 'error');
        }
        printQuestion();
    };
}, false);
