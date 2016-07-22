var debug = 0x1;

n = (N) => N || 0
// multi op: single 32bit number specifies 8bit instruction, 8bit register (if any),
//           and 16bit number for value
mi = (I, O, V) => [(((n(I) << 0) | (n(O) << 4)) << 8) | n(V)]
// simple op: single 32bit number specifies 16bit instruction, and a 24bit number
//           for value.
mi1 = (I, O) => [(n(I) << 8) | n(O)]
// extended op: single 32bit number specifies instruction, another 32bit
//           specifies value
mi2 = (I, O, V) => [(n(I) << 0) | (n(O) << 8), n(V)]
bits = (N) => N.toString(2)

o_nop = 0x0;
o_lrl = 0x1; // load to register from literal
o_lra = 0x2; // load to register from address
o_rla = 0x3; // load from register to address
o_rlr = 0x4; // load from register to register
o_in  = 0x5; // read from port
o_out = 0x6; // write to port
o_psh = 0x7; // push onto stack
o_pop = 0x8; // pop from stack
o_peek= 0x9; // peek at stack
o_stle= 0x10; // get stack length
o_jcmp= 0x11; // jump with comparison
              // jcmp mt0, 34
o_xor = 0x12;// xor [reg1], [mask]
o_ext = 0xF; // extended instruction
o_e_halt = 0x01; // halt system
o_e_stat = 0x0F; // print state
ops = {};
ops.nop = o_nop;
ops.lrl = o_lrl;
ops.rla = o_rla;
ops.lrl = o_rlr;
ops.in  = o_in;
ops.put = o_out;
ops.psh = o_psh;
ops.pop = o_pop;
ops.peek= o_peek;
ops.stle= o_stle;
ops.jcmp= o_jcmp;
ops.xor = o_xor;
ops.halt = (0xF0) | o_e_halt;
ops.stat = (0xF0) | o_e_stat;

r_cp  = 0x0;
r_r0  = 0x1;
r_r1  = 0x2;
r_r2  = 0x3;
r_r3  = 0x4;
r_ac  = 0x5;
r_dc  = 0x6;
r_mt0 = 0x7;
r_lt0 = 0x8;
r_eq0 = 0x9;
r_v   = 0x10;
regs = {};
regs.cp = r_cp; regs[r_cp] = 'cp';
regs.r0 = r_r0; regs[r_r0] = 'r0';
regs.r1 = r_r1; regs[r_r1] = 'r1';
regs.r2 = r_r2; regs[r_r2] = 'r2';
regs.r3 = r_r3; regs[r_r3] = 'r3';
regs.ac = r_ac; regs[r_ac] = 'ac';
regs.dc = r_dc; regs[r_dc] = 'dc';
regs.mt0 = r_mt0; regs[r_mt0] = 'mt0';
regs.lt0 = r_lt0; regs[r_lt0] = 'lt0';
regs.eq0 = r_eq0; regs[r_eq0] = 'eq0';
regs.v   = r_v; regs[r_v] = 'v';

p_stdin  = 0x1;
p_stdout = 0x2;
p_stderr = 0x3;
ports = {};
ports.stdin = p_stdin;
ports.stdout = p_stdout;
ports.stderr = p_stderr;

_nop = () => mi(o_nop, 0x0, 0x0)
_lrl = (Reg, Lit) => mi(o_lrl, Reg, Lit)
_lra = (Reg, Adr) => mi(o_lra, Reg, Adr)
_rlr = (R0, R1)   => mi(o_rlr, R0,  R1)
_in  = (Port)     => mi(o_in,  Port, 0x0)
_out = (Port, Reg)=> mi(o_out, Reg, Port)
_push= (Value)    => mi1(o_psh, Value)
_pop = (Reg)      => mi(o_pop,  Reg, 0x0)
_peek= (Reg)      => mi(o_peek, Reg, 0x0)
_stle= ()         => mi(o_stle, 0x0, 0x0)
_jcmp= (WhichReg, CpAddition) =>
    mi(o_jcmp, WhichReg, CpAddition)
_xor = (Reg, Mask)=> mi(o_xor, Reg, Mask)
_halt= ()         => 0x1F << 8;
_stat= ()         => 0xFF << 8;
ins = {};
ins.nop = _nop;
ins.lrl = _lrl;
ins.lra = _lra;
ins.rlr = _rlr;
ins.in  = _in;
ins.out = _out;
ins.push= _push;
ins.pop = _pop;
ins.peek= _peek;
ins.stle= _stle;
ins.jcmp= _jcmp;
ins.xor = _xor;
ins.halt=_halt;
ins.stat=_stat;

function dbg () {
    if(debug)
        console.log.apply(console, arguments);
}

var symbols = {
    ops: ops,
    regs: regs,
    ports: ports,
    ins: ins
};

code = "lrl r0, 'H'\n" +
       "lrl r1, 'i'\n" +
       "lrl r2, '!'\n" +
       "lrl r3, 10\n" +
       "out stdout, r0\n" +
       "out stdout, r1\n" +
       "out stdout, r2\n" +
       "out stdout, r3\n" +
       "halt\n";

// print same by adjusting values
code = 
       // push '!'
       "lrl r0, '!'\n" +
       "push r0\n" +

       "lrl ac, 0\n" +    // reset ac
       "peek r0\n" +      // pull stored value from stack
       "lrl r1, 78\n" +   // add 78 (using ac)
       "push ac\n" +

       // now want to add -3
       "lrl dc, 0\n" +     // clear dc
       "lrl r1, 3\n" +     // load 3
       "push dc\n" +       // dc now has -3, push it
       "lrl ac, 0\n" +     // clear ac
       "pop r0\n" +        // read -3
       "peek r0\n" +       // ac is now -3 + 111
       "push r0\n" +       // duplicate

       // calculate -7 for next char
       "lrl dc, 0\n" +     // clear dc
       "lrl r1, 7\n" +     // load 3
       "push dc\n" +       // dc now has -3, push it
       "lrl ac, 0\n" +     // clear ac
       "pop r0\n" +        // read -3
       "peek r0\n" +       // ac is now -3 + 111
       "push ac\n" +       // duplicate
       "stat\n" +
       "halt\n";

if(0)code = "lrl r0, 65\n" +
       "push r0\n" +
       "lrl r0, 0\n" +
       "peek r0\n" +
       "out stdout, r0\n" +
       "pop r1\n" +
       "out stdout, r1\n" +
       "stat\n" +
       "halt";
const flatten = arr => arr.reduce(
  (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);

function compile (c) {
    lines = c.split("\n");
    var result = [];
    for(var i = 0; i < lines.length; i++) {
        result.push(compile_line(lines[i]));
    }
    return flatten(result);
}

function compile_line (line) {
    if(line.length == 0) return _nop();
    var m = line.match(/^([A-Za-z]+)(.*$)?/);
    dbg(m);
    if(!m) throw 'unable to parse: ' + line;
    var i = m[1];
    var params = m[2] ? m[2].trim() : undefined;
    var found = ins[i];
    if(found) {
        return compile_ins(i, params);
    } else {
        throw "unknown ins: " + i;
    }
}

var plist_cache = {};
function compile_ins (i, params) {
    // Parse function to get the parameters
    var plist = plist_cache[i];
    var req_params;
    var req_pcount;
    if(!plist) {
        plist = plist_cache[i] = ins[i].toString().match(/^\(([^)]+)\)/);
    }
    // Params?
    if(plist) {
        plist = plist[1];
        req_params = plist.split(',');
        req_pcount = req_params.length;
    } else {
        plist = "";
        req_params = [];
        req_pcount = req_params.length;
    }
    var giv_params = [];
    if(params)
        giv_params = params.split(',');
    var giv_pcount = giv_params.length;
    if(giv_pcount != req_pcount) {
        dbg("Invalid number of parameters given for instruction `" + i + "`");
        dbg("Instruction: " + ins[i]);
        dbg("Given: " + params);
        dbg("Expected: " + plist);
        dbg("Given(" + giv_pcount + "), expected(" + req_pcount + ")");
    }
    var parse_params = giv_params.map(compile_ins_param);
    dbg(parse_params);
    return ins[i].apply({}, parse_params);
}

function compile_ins_param (p) {
    p = p.trim();
    var result = compile_ins_param_inner(p);
    dbg("Parse `" + p + "` into: " + result);
    return result;
}
function compile_ins_param_inner (p) {
    var m;
    // Matches: 123, 0xF23, 0123. Whole numbers only.
    if(m = p.match(/(?:^0x[A-Fa-f0-9]+)|(?:^[0-9]+)|(?:^0[0-9]+)/)) {
        dbg("Parse number", m);
        return parseInt(p);
    }
    // Matches: 'H' for ascii value
    m = p.match(/^(?:'([^']+)')/);
    dbg(p, m);
    if(m) {
        var ch = m[1];
        if(ch[0] == '\\')
            ch = ch[1];
        dbg("Parse charcode of `" + ch + "` to: " + ch.charCodeAt(0));
        return ch.charCodeAt(0);
    }
    for(var key in symbols) {
        for(var name in symbols[key]) {
            if(name == p) {
                dbg("Found matching name in " + key + "/" + name);
                return symbols[key][name];
            }
        }
    }
    throw 'unknown symbol: ' + p;
}

function Port (id) {
    this._in = () => 0;
    this._out = () => 0;
}
Port.prototype.in = function() {
    return this._in();
};
Port.prototype.out = function(v) {
    return this._out(v);
};

port_stdin = new Port(p_stdin); port_stdin._in = () => 0;
port_stdout = new Port(p_stdout);
    port_stdout._out = (V) => {
        process.stdout.write(String.fromCharCode(V));
    }
port_stderr = new Port(p_stderr);
    port_stderr._out = (V) => process.stderr.write(String.fromCharCode(V));

function VSVM (code) {
    this.code = code;
    this.regs = {};
    for(var key in regs) {
        if(!key.match(/^[0-9]+$/))
            this.regs[regs[key]] = 0x0;
    }
    this.ports = [];
    this.ports.legnth = 3;
    this.ports[p_stdin] = port_stdin;
    this.ports[p_stdout] = port_stdout;
    this.ports[p_stderr] = port_stderr;
    this.halt = false;
    this.stack = [];
}

VSVM.prototype.cycle = function() {
    var cp = this.regs[r_cp];
    var i  = this.code[cp];

    if(this.halt)
        return;

    if(i === undefined)
        throw 'no instruction';

    // Break down instruction
    dbg("Instruction:", i.toString(2), i);
    var op = i >> 8;
    dbg("Op:", op.toString(2), op);
    var val = i & 0xFF;
    var opbot = op >> 4;
    var optop = op & 0xF;
    dbg("Optop:", optop.toString(2), optop);
    dbg("Opbot:", opbot.toString(2), opbot);
    dbg("Value:", val.toString(2), val);

    var v = 0x0;

    switch(optop) {
        case o_nop:
            dbg("NOP");
            break;
        case o_lrl:
            dbg("LRL to " + regs[opbot] + ", value: " + val);
            v = this.regs[opbot] = val;
            break;
        case o_rlr:
            dbg("RLR from " + regs[opbot] + " to " + regs[val]);
            v = this.regs[opbot] = this.regs[val];
            break;
        case o_out:
            //v = this.regs[opbot];
            dbg("OUT from reg " + regs[opbot] + "(" + this.regs[opbot] + "), port: " + val);
            this.ports[val].out(v);
            break;
        case o_psh:
            dbg("PUSH value in reg: " + regs[val] + "(" + this.regs[val] + ")");
            this.stack.push(this.regs[val]);
            v = this.regs[val];
            break;
        case o_pop:
            this.regs[opbot] = this.stack.pop();
            v = this.regs[opbot];
            dbg("POP to reg: " + regs[opbot] + ", got: " + this.regs[opbot]);
            break;
        case o_peek:
            this.regs[opbot] = this.stack[this.stack.length-1];
            v = this.regs[opbot];
            dbg("PEEK to reg: " + regs[opbot] + ", got: " + this.regs[opbot]);
            break;
        case 0xF:
            // Extended operations
            switch(opbot) {
                case o_e_halt:
                    dbg("HALT");
                    this.halt = true;
                    break;
                case o_e_stat:
                    dbg("STAT");
                    console.log("CPU state:", this.getStatePretty());
                    break;
                default:
                    console.log("Unhandled extended op: 0x" + opbot.toString(16));
            }
            break;
        default:
            console.log("Unhandled op: 0x" + optop.toString(16));
    }
    if(v) {
        this.regs[r_ac] += v;
        this.regs[r_dc] -= v;
        this.regs[r_mt0] = (v > 0 ? 1 : 0);
        this.regs[r_lt0] = (v < 0 ? 1 : 0);
        this.regs[r_eq0] = (v == 0 ? 1 : 0);
    }
    this.regs[r_cp]++;
};

VSVM.prototype.getStatePretty = function() {
    var s = ['CPU State: { Registers: '];
    var x = {};
    for(var key in regs) {
        if(!key.match(/^[0-9]+$/)) {
            s.push(key + ': ' + this.regs[regs[key]]);
        }
    }
    s.push('Stack: [');
    for(var i = 0; i < this.stack.length; i++)
        s.push(i + ": " + this.stack[i]);
    s.push(']');
    return s.join(', ') + ' }';
};

var compiled = compile(code);
dbg("Compiled code: ", compiled);
var vm = new VSVM(compiled);

do {
    vm.cycle();
} while (!vm.halt && !vm.int_scheduled);
