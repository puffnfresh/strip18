var StripAST = (function() {
    function constructor(name, fields) {
        function Ctor() {}
        Ctor.prototype = wrapped.prototype;
        function wrapped() {
            var instance;
            if(!(this instanceof wrapped)) {
                instance = new Ctor();
                wrapped.apply(instance, arguments);
                return instance;
            }
            if(arguments.length != fields.length) {
                throw new TypeError("Expected " + fields.length + " arguments, got " + arguments.length);
            }
            for(i = 0; i < fields.length; i++) {
                this[fields[i]] = arguments[i];
            }
        }
        wrapped.name = wrapped._name = name;
        wrapped.length = wrapped._length = fields.length;
        return wrapped;
    }

    function sumConstructors(constructors) {
        var defined = 0, definitions = {}, key;

        function makeCata(fields, index) {
            return function() {
                var args = [], i;
                if(arguments.length != defined) {
                    throw new TypeError("Expected " + defined + " arguments, got " + arguments.length);
                }
                for(i = 0; i < fields.length; i++) {
                    args.push(this[fields[i]]);
                }
                return arguments[index].apply(this, args);
            };
        }

        for(key in constructors) {
            definitions[key] = constructor(key, constructors[key]);
            definitions[key].prototype.cata = makeCata(constructors[key], defined);
            defined++;
        }

        return definitions;
    }

    return sumConstructors({
        Lambda: ['args', 'body'],
        Apply: ['func', 'args'],
        Identifier: ['name'],
        Num: ['n'],
        Add: ['left', 'right'],
        Mul: ['left', 'right'],
        Sub: ['left', 'right'],
        Div: ['left', 'right'],
        Not: ['e'],
        Gt: ['left', 'right'],
        Lt: ['left', 'right'],
        And: ['left', 'right'],
        Or: ['left', 'right']
    });
})();

function Evaluator() {
    var level = 0;
    var question = 0;
    var features = [];
    var levels = [
        {
            achievement: 'addition',
            message: "You're a master of natural numbers. I've now given you the + operator.",
            questions: [
                {
                    text: 'What is 1 + 1?',
                    answer: 1 + 1
                },
                {
                    text: 'What is 12 + 39?',
                    answer: 12 + 39
                },
                {
                    text: 'What is 391 + 318?',
                    answer: 391 + 318
                }
            ]
        },
        {
            achievement: 'all numeric operators',
            message: "Fine. You now have the -, * and / operators.",
            questions: [
                {
                    text: 'What is 2 * 39?',
                    answer: 2 * 39
                },
                {
                    text: 'What is 4 * 66?',
                    answer: 4 * 66
                },
                {
                    text: 'What is 6 * 382?',
                    answer: 6 * 382
                }
            ]
        },
        {
            achievement: 'booleans',
            message: "Natural numbers are easy. Time for logic. You now have true and false.",
            questions: [
                {
                    text: 'What results in -376?',
                    answer: -376
                },
                {
                    text: 'What results in 10.25?',
                    answer: 10.25
                },
                {
                    text: 'What results in -70.5?',
                    answer: -70.5
                }
            ]
        },
        {
            achievement: 'boolean operators',
            message: "You now have the !, >, <, && and || operators.",
            questions: [
                {
                    text: 'Is (3 * 7) > (4 * 6)?',
                    answer: false
                },
                {
                    text: 'What is !(true && (false || true))?',
                    answer: false
                },
                {
                    text: 'What is !((4 * 3) > 12) && (100 < (38 * 3))?',
                    answer: true
                }
            ]
        },
        {
            achievement: 'lambdas',
            message: "You can now use lambdas like so: ((a, b) => (a + b))(1, 2)",
            questions: [
                {
                    text: 'What is (!a) && a where a = false?',
                    answer: !false && false
                },
                {
                    text: 'What is (a*b) + (b/a) where a = 3 and b = 9?',
                    answer: (3*9) + (9/3)
                },
                {
                    text: 'What is (a*a) + (b*b) + (c*c) where a = 2, b = 4 and c = 5?',
                    answer: 2*2+4*4+5*5
                }
            ]
        },
        {
            achievement: 'finished',
            message: "You now have all your powers back, congratulations!",
            questions: [
                {
                    text: 'What is a*a*a*a*a*a*a where a = 5??',
                    answer: (function(a){return a*a*a*a*a*a*a;})(5)
                },
                {
                    text: 'What is (a*b) + (b-c) + (c*a) + (d/b) where a = 3, b = 10, c = 4 and d = 20?',
                    answer: (function(a,b,c,d){return a*b+(b-c)+c*a+d/b;})(3,10,4,20)
                }
            ]
        }
    ];

    function finished() {
        return level >= levels.length;
    }

    this.question = function() {
        if(finished()) {
            return "You've finished STRIP-18!";
        }
        return levels[level].questions[question].text;
    };

    function require(feature) {
        if(features.indexOf(feature) == -1) {
            throw new Error("You haven't unlocked " + feature + " yet.");
        }
    }

    function evalEnv(env, node) {
        function recurse(node) {
            return evalEnv(env, node);
        }
        return node.cata(
            function(args, body) {
                require('lambdas');
                return {
                    args: args,
                    body: body
                };
            },
            function(func, args) {
                var f = recurse(func);
                var newEnv = {};
                var name;
                var i;

                if(f.args.length != args.length) {
                    throw new Error("Tried calling a function with different number of arguments.");
                }

                for(name in env) {
                    newEnv[name] = env[name];
                }
                for(i = 0; i < f.args.length; i++) {
                    newEnv[f.args[i]] = recurse(args[i]);
                }

                return evalEnv(newEnv, func.body);
            },
            function(name) {
                if(['true', 'false'].indexOf(name) != -1) {
                    require('booleans');
                    return name == 'true';
                }
                require('lambdas');
                return env[name];
            },
            function(n) {
                return parseInt(n, 10);
            },
            function(l, r) {
                require('addition');
                return recurse(l) + recurse(r);
            },
            function(l, r) {
                require('all numeric operators');
                return recurse(l) * recurse(r);
            },
            function(l, r) {
                require('all numeric operators');
                return recurse(l) - recurse(r);
            },
            function(l, r) {
                require('all numeric operators');
                return recurse(l) / recurse(r);
            },
            function(e) {
                require('boolean operators');
                return !recurse(e);
            },
            function(l, r) {
                require('boolean operators');
                return recurse(l) > recurse(r);
            },
            function(l, r) {
                require('boolean operators');
                return recurse(l) < recurse(r);
            },
            function(l, r) {
                require('boolean operators');
                return recurse(l) && recurse(r);
            },
            function(l, r) {
                require('boolean operators');
                return recurse(l) || recurse(r);
            }
        );
    }

    function evaluate(ast) {
        var result = evalEnv({}, ast);
        var correct = finished() || result == levels[level].questions[question].answer;
        var message;
        if(correct && !finished()) {
            question++;
            if(question >= levels[level].questions.length) {
                message = levels[level].message;
                features.push(levels[level].achievement);
                level++;
                question = 0;
            }
        }
        return {
            correct: correct,
            message: message,
            value: result
        };
    }
    this.evaluate = evaluate;
}

function Parser() {
    this.parse = function(str) {
        var ws = gll.regexp(/\s*/);
        var identifier = gll.regexp(/[a-z]+/);
        var argList = gll.makeParser(function() {
            return gll.alt(
                gll.red(gll.seq(identifier), function(i) {
                    return [i];
                }),
                gll.red(gll.seq(identifier, ws, gll.string(','), ws, argList), function(i, w0, s0, w1, rest) {
                    return [i].concat(rest);
                })
            );
        });
        var applyList = gll.makeParser(function() {
            return gll.alt(
                gll.red(gll.seq(expr), function(i) {
                    return [i];
                }),
                gll.red(gll.seq(expr, ws, gll.string(','), ws, applyList), function(i, w0, s0, w1, rest) {
                    return [i].concat(rest);
                })
            );
        });
        var expr = gll.makeParser(function() {
            return gll.alt(
                gll.red(gll.seq(expr, ws, gll.string('+'), ws, expr), function(l, w0, s0, w1, r) {
                    return StripAST.Add(l, r);
                }),
                gll.red(gll.seq(expr, ws, gll.string('*'), ws, expr), function(l, w0, s0, w1, r) {
                    return StripAST.Mul(l, r);
                }),
                gll.red(gll.seq(expr, ws, gll.string('-'), ws, expr), function(l, w0, s0, w1, r) {
                    return StripAST.Sub(l, r);
                }),
                gll.red(gll.seq(expr, ws, gll.string('/'), ws, expr), function(l, w0, s0, w1, r) {
                    return StripAST.Div(l, r);
                }),
                gll.red(gll.seq(gll.string('!'), ws, expr), function(s0, w0, e) {
                    return StripAST.Not(e);
                }),
                gll.red(gll.seq(expr, ws, gll.string('>'), ws, expr), function(l, w0, s0, w1, r) {
                    return StripAST.Gt(l, r);
                }),
                gll.red(gll.seq(expr, ws, gll.string('<'), ws, expr), function(l, w0, s0, w1, r) {
                    return StripAST.Lt(l, r);
                }),
                gll.red(gll.seq(expr, ws, gll.string('&&'), ws, expr), function(l, w0, s0, w1, r) {
                    return StripAST.And(l, r);
                }),
                gll.red(gll.seq(expr, ws, gll.string('||'), ws, expr), function(l, w0, s0, w1, r) {
                    return StripAST.Or(l, r);
                }),
                gll.red(gll.seq(gll.string('('), argList, gll.string(')'), ws, gll.string('=>'), ws, expr), function(s0, args, s1, w0, s2, w1, body) {
                    return StripAST.Lambda(args, body);
                }),
                gll.red(gll.seq(expr, ws, gll.string('('), ws, applyList, ws, gll.string(')')), function(func, w0, s0, w1, args, w2, s1) {
                    return StripAST.Apply(func, args);
                }),
                gll.red(gll.seq(gll.string('('), expr, gll.string(')')), function(s0, e, s1) {
                    return e;
                }),
                gll.red(identifier, StripAST.Identifier),
                gll.red(gll.regexp(/[0-9]+/), StripAST.Num)
            );
        });
        return expr(str.replace(/^\s+/, '').replace(/\s+$/, ''));
    };
}
