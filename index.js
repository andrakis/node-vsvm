/**
 *
 * Tricks:
 *   copy a value from one register to another:
 *     push reg_to_copy_from
 *     pop reg_to_copy_to
 *   jump to a label:
 *     lrl r0, $end
 *     push r0
 *     pop cp
 *     end:
 *     halt
 */
var debug = 0x1;

n = (N) => N || 0
m8888 = (A, B, C, D) => {
	// 32bit number
	var ab = new ArrayBuffer(4);
	var vw = new DataView(ab);
	vw.setUint8(0, A);
	vw.setUint8(1, B);
	vw.setUint8(2, C);
	vw.setUint8(3, D);
	return vw.getUint32(0);
};
m8816 = (A, B, C) => {
	var ab = new ArrayBuffer(4);
	var vw = new DataView(ab);
	vw.setUint8(0, A);
	vw.setUint8(1, B);
	vw.setUint16(2, C);
	return vw.getUint32(0);
};
// multi op: single 32bit number specifies 8bit instruction, 8bit register (if any),
//           and 16bit number for value
//mi = (I, O, V) => [(((n(I) << 0) | (n(O) << 8)) << 8) | n(V)]
//mi = (I, O, V) => [(((n(I) << 4) | O) << 8) | n(V)]
mi = (I, O, V) => [m8816(I, O, V)];
// simple op: single 32bit number specifies 16bit instruction, and a 16bit number
//           for value.
mi1 = (I, V)   => [m8816(I, 0, V)];
// TODO: WRONG
// extended op: single 32bit number specifies 8bit instruction, 8bit register (if any),
//           an 8bit value, and a 32bit secondary value
mi2 = (I, O, V1, V2) => [mi(I, O, V1), n(V2)]
bits = (N) => N.toString(2)

o_nop = 0x0;
o_lrl = 0x1; // load to register from literal
o_lra = 0x2; // load to register from address
o_rla = 0x3; // load from register to address
o_in  = 0x4; // read from port
o_out = 0x5; // write to port
o_psh = 0x6; // push onto stack
o_pop = 0x7; // pop from stack
o_peek= 0x8; // peek at stack
o_stle= 0x9; // get stack length
o_jcmp= 0xA; // jump with comparison
             // jcmp mt0, 34     # only jumps to 34 if mt0 is 1
o_bit = 0xB; // perform bit operation: bit [op:xor,etc], [8bit:reg1,8bit:reg2],32bit:mask or val]
o_int = 0xC; // extended instruction
o_idis = 0x01; // disable interrupts (cause them to pend)
o_iena = 0x02; // enable interrupts
o_istp = 0x03; // setup interrupt [8bit:id,8bit:register_with_call_addr]
               // interrupt gets called with return address, int id, followed by custom arguments
o_idel = 0x04; // delete interrupt [16bit:id]
o_iint = 0x05; // call interrupt (8bit:id) (push a value first if needed)
o_ext = 0xF; // extended instruction
o_e_halt = 0x01; // halt system
o_e_stat = 0x0F; // print state
ops = {};
ops.nop = o_nop;
ops.lrl = o_lrl;
ops.rla = o_rla;
ops.in  = o_in;
ops.put = o_out;
ops.psh = o_psh;
ops.pop = o_pop;
ops.peek= o_peek;
ops.stle= o_stle;
ops.jcmp= o_jcmp;
//ops.xor = o_xor;
ops.idis=  o_idis;
ops.iena=  o_iena;
ops.istp=  o_istp;
ops.idel=  o_idel;
ops.int =  o_iint;
ops.halt = o_e_halt;
ops.stat = o_e_stat;

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
_push= (Value)    => mi(o_psh, Value, 0x0)
_pop = (Reg)      => mi(o_pop,  Reg, 0x0)
_peek= (Reg)      => mi(o_peek, Reg, 0x0)
_stle= ()         => mi(o_stle, 0x0, 0x0)
_jcmp= (WhichReg, Location) =>
    mi(o_jcmp, WhichReg, Location)
_xor = (Reg, Mask)=> mi(o_xor, Reg, Mask)
_halt= ()         => mi(o_ext, o_e_halt, 0)
_stat= ()         => mi(o_ext, o_e_stat, 0)
_idis= ()         => mi(o_int, o_idis, 0x0 << 8)
_iena= ()         => mi(o_int, o_iena, 0x0 << 8)
_istp= (Id, Reg)  => mi(o_int, o_istp, (Id << 8) | Reg)
_idel= (Id)       => mi(o_int, o_del,  (Id << 8))
_int=  (Id)       => mi(o_int, o_iint, (Id << 8))
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
ins.idis=_idis;
ins.iena=_iena;
ins.istp=_istp;
ins.idel=_idel;
ins.int =_int;

// Extended instructions take more than a 32bit instruction size.
// Their total size is indicated by this table, which is currently empty.
var extended_ins = {
};

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

// Print: 'Hi!\n'
code = "lrl r0, 'H'\n" +
       "lrl r1, 'i'\n" +
       "lrl r2, '!'\n" +
       "lrl r3, 10\n" +
       "out stdout, r0\n" +
       "out stdout, r1\n" +
       "out stdout, r2\n" +
       "out stdout, r3\n" +
       "halt\n";

// print 'Hello!' by using accumulator and decumulator and
// operating on the last character pushed
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
       "peek r0\n" +       // read 111
       "push ac\n" +       // ac is now -3 + 111
       "peek r0\n" +       // peek and push to duplicate
       "push r0\n" +

       // calculate -7 for next char
       "lrl dc, 0\n" +     // clear dc
       "lrl r1, 7\n" +     // load 7
       "push dc\n" +       // dc now has -7, push it
       "lrl ac, 0\n" +     // clear ac
       "pop r0\n" +        // read -7
       "peek r0\n" +       // ac is now -7 + 108
       "push ac\n" +       // push char

       // calculate -29 for next char
       "lrl dc, 0\n" +     // clear dc
       "lrl r1, 29\n" +    // load 29
       "push dc\n" +       // dc now has -29, push it
       "lrl ac, 0\n" +     // clear ac
       "pop r0\n" +        // read -29
       "peek r0\n" +       // ac is now -29 + 101
       "push ac\n" +       // push char
       "stat\n" +
       "halt\n";

// Test the comment parsing and label substitution
code = `
# This is a comment
start:      # Also a comment
lrl r0, 1   # Final comment
push r0
lrl r0, '#'    # Push something in quotes
push r0
lrl r0, $start # Load a label address
stat
# Clear stack
pop r1
pop r1
# Sneaky. Endless loop here if you remove the next 3 lines
  lrl r0, $end
  push r0
  pop cp
push r0
pop cp
end:
halt
`;

if(0) code = `
lrl r0, '#'    # Push something in quotes
push r0
stat
halt
`;

if(0)code = "lrl r0, 65\n" +
       "push r0\n" +
       "lrl r0, 0\n" +
       "peek r0\n" +
       "out stdout, r0\n" +
       "pop r1\n" +
       "out stdout, r1\n" +
       "stat\n" +
       "halt";

// Print the numbers 0 - 9 and halt
code = `
    # uses r2 for current count
    lrl r2, 1
    # uses r3 for character to output
    # load '0' into it to begin
    lrl r3, '0'

    again:
        # print char
        out stdout, r3
        # calc r2 + 1 and store
        push r2
        lrl ac, 0
        pop r2
        lrl r0, 1
        push ac
        pop r2

        # calc r3 + 1 and store
        push r3
        lrl ac, 0
        pop r3
        lrl r0, 1
        push ac
        pop r3

        # check if r2 has reached 9 yet
        push r2
        lrl ac, 0
        lrl dc, 0
        lrl r0, 11
        push dc
        lrl ac, 0
        pop r0
        pop r0
        push ac
        pop r0
        jcmp lt0, $again

        # Print a newline
        lrl r0, 10
        out stdout, r0
        halt
`;

code = `
    idis
    lrl r0, '!'
    lrl r1, 'i'
    lrl r2, 'H'
    push r0
    push r1
    push r2
    lrl r0, $handler
    istp 42, r0 # setup interrupt
    iena # enable interrupts
    int 42
    # print newline
    lrl r0, 10
    out stdout, r0
    halt

    handler:
    stat
    pop r0   # int id (ignore, but should be 1)
    pop r1   # return addr
    pop r2   # char to print
    out stdout, r2
    pop r2
    out stdout, r2
    pop r2
    out stdout, r2
    push r1  # return to
    pop cp   # caller
`;

const flatten = arr => arr.reduce(
  (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);

var regex_allowable_symbol = new RegExp(/^\$([A-Za-z_$][A-Za-z0-9_$]*)/);
var regex_label = new RegExp(/^\s*([A-Za-z_$][A-Za-z0-9_$]*):/);

function compile (c) {
    lines = c.split("\n");
    var state = { symbols: {}, data: [] };
    // Order:
    //  1 Parse all lines, clean them of comments, and insert placeholders
    //  2 Parse all lines again, converting them to instruction creation
    //    calls. That is, return something like: [ 'lrl', 'r0', '$end' ]
    //  3 Parse instruction creation lists:
    //    - each opcode defaults to a single 32bit number.
    //    - some opcodes are extended and may be 32+16bits
    //    - Produce an output list that resolves symbol addresses by
    //      keeping a running count of bytes output (depending on opcode)
    //      and setting symbols to equal their occurance position
    //  4 Parse instruction creation lists again and call instruction
    //    creation function with resolved parameters.
    // Stage 1 and 2:
    var result = lines.map(line => compile_line(line, state));
    // Stage 3:
    // Instead of counting bytes, we're just counting ops here.
    // This is because we're not currently using a byte-based memory format.
    // Presently any operation takes a single memory location, regardless of size
    var ins_counter = 0;
    result.forEach(ic => {
        if(ic.length == 0)
            return;
        var i = ic[0];
        var params = ic.slice(1);
        dbg(` St3: instruction: ${i}, params:`, params);
        /* Not used: not using byte-based memory
        if(extended_ins[i])
            ins_counter++;
        */
        var label = i.match(regex_label);
        if(label) {
            var name = label[1];
            dbg(`Found label '${name}' at estimate pos: ${ins_counter}`);
            if(state.symbols[name] !== undefined) {
                dbg(`WARN: Symbol redefinition of '${name}'`, state.symbols[name]);
            }
            // change the instruction to a nop
            ic[0] = 'nop';
            state.symbols[name] = ins_counter;
        }
        ins_counter++;
    });
    dbg("Stage 3 state:", state);
    // Stage 4
    result = result.map(ic => {
        // This time we'll go through params and replace $symbols.
        // Then we'll call the instruction generation function
        if(ic.length == 0) return [];
        ic = ic.map((I, Index) => {
            if(Index == 0) return I; // skip instruction, only do parameters
            if(typeof I == 'string') {
                var m = I.match(regex_allowable_symbol);
                var name = m[1];
                dbg(" St4:", m);
                if(state.symbols[name] === undefined) {
                    throw 'could not resolve: $' + name;
                }
                return state.symbols[name];
            }
            return I;
        });
        // Call instruction creation function with params
        var i = ic[0];
        var params = ic.slice(1);
        return ins[i].apply({}, params);
    });
    result = flatten(result);
    dbg("\n\nFinal result:\n\n",result.map(N=>"0x"+N.toString(16)));
    return result;
}

function compile_line (line, state) {
    line = remove_comments(line).trim();
    if(line.length == 0) return [  ];
    var m;
    m = line.match(regex_label);
    if(m) {
        var label = m[1];
        dbg('Label:', label);
        state.symbols[label] = undefined; // will be filled later
        return [ m[1] + ':' ];
    }
    m = line.match(/^([A-Za-z]+)(?: (.*$))?/);
    dbg(m);
    if(!m) throw 'unable to parse: ' + line;
    var i = m[1];
    var params = m[2] ? m[2].trim() : undefined;
    var found = ins[i];
    if(found) {
        return compile_ins(i, params, state);
    } else {
        throw "unknown ins: " + i;
    }
}

function remove_comments (line) {
    var in_speech = false, speech_type = "";
    var comment = '#', in_comment = false;
    var out = "";
    line.split('').forEach((C) => {
        //console.log(`ch: ${C}, in_sp: ${in_speech}, st: ${speech_type}, in_c: ${in_comment}`);
        if(in_comment) return;
        switch(C) {
            case comment:
                if(!in_speech) {
                    in_comment = true;
                } else {
                    out += C;
                }
                break;
           case '"':
                if(!in_speech) {
                    speech_type = '"';
                    in_speech = true;
                } else if(in_speech && speech_type == '"') {
                    in_speech = false;
                }
                out += C;
                break;
           case "'":
                if(!in_speech) {
                    speech_type = "'";
                    in_speech = true;
                } else if(in_speech && speech_type == "'") {
                    in_speech = false;
                }
                out += C;
                break;
           default:
                out += C;
                break;
        }
    });
    return out;
}

var plist_cache = {};
function compile_ins (i, params, state) {
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
    return [i].concat(parse_params); //ins[i].apply({}, parse_params);
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
    // Matches $symbol
    if(p[0] == '$') return p;
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
    this.interrupts = {}; // id => handler
    this.interrupts_enabled = false;
}

VSVM.prototype.cycle = function() {
    var cp = this.regs[r_cp];
    var i  = this.code[cp];

    if(this.halt)
        return;

    if(i === undefined)
        throw 'no instruction';

    // Break down instruction
    // TODO: This is probably quicker as bit operations. Figure it out.
    var ab = new ArrayBuffer(4);
    var av = new DataView(ab);
    av.setUint32(0, i);
    op = av.getUint16(0);
    val = av.getUint16(2);
    optop = av.getUint8(0);
    opbot = av.getUint8(1);
    dbg("  Instruction:", i.toString(2), "0x" + i.toString(16));
    dbg("  Op:", op.toString(2), op);
    dbg("  Optop:", optop.toString(2), "0x" + optop.toString(16));
    dbg("  Opbot:", opbot.toString(2), "0x" + opbot.toString(16));
    dbg("  Value:", val.toString(2), "0x" + val.toString(16));

    var v = 0x0;

    switch(optop) {
        case o_nop:
            dbg("NOP");
            break;
        case o_lrl:
            dbg("LRL to " + regs[opbot] + ", value: " + val);
            v = this.regs[opbot] = val;
            break;
        case o_out:
            //v = this.regs[opbot];
            dbg("OUT from reg " + regs[opbot] + "(" + this.regs[opbot] + "), port: " + val);
            this.ports[val].out(this.regs[opbot]);
            break;
        case o_psh:
            dbg("PUSH value in reg: " + regs[opbot] + "(" + this.regs[opbot] + ")");
            this.stack.push(this.regs[opbot]);
            v = this.regs[opbot];
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
        case o_jcmp:
            dbg("JCMP, jump to " + val + " if " + regs[opbot] + "(" + this.regs[opbot] + ") is !0");
            if(this.regs[opbot])
                this.regs[r_cp] = val;
            break;
        case o_int:
            // Interrupt functions
            var inttop = av.getUint8(2);
            var intbot = av.getUint8(3);
            dbg("    INT instruction: 0x" + val.toString(16));
            dbg("    Top: 0x" + inttop.toString(16));
            dbg("    Bot: 0x" + intbot.toString(16));
            switch(opbot) {
                case o_idis:
                    this.interrupts_enabled = false;
                    dbg("IDIS, interrupts_enabled = false");
                    break;
                case o_iena:
                    this.interrupts_enabled = true;
                    dbg("IENA, interrupts_enabled = true");
                    break;
                case o_istp:
                    dbg("ISTP " + inttop + " using " + regs[intbot] + " (" + this.regs[intbot] + ")");
                    this.setupInterrupt(inttop, this.regs[intbot]);
                    break;
                case o_iint:
                    dbg("INT 0x" + inttop.toString(16) + " (" + inttop + ")");
                    this.Interrupt(inttop);
                    break;
                default:
                    dbg("Unhandled int: 0x" + opbot.toString(16));
                    break;
            }
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

VSVM.prototype.setupInterrupt = function (Id, Cp) {
    this.interrupts[Id] = Cp;
};

VSVM.prototype.deleteInterrupt = function (Id) {
    delete this.interrupts[Id];
};

VSVM.prototype.Push = function(Value) {
    this.stack.push(Value);
};

VSVM.prototype.Interrupt = function(Id) {
    dbg("    Pushing current cp (" + this.regs[r_cp] + ")");
    this.Push(this.regs[r_cp]);
    dbg("    Pushing int id (" + Id + ")");
    this.Push(Id);
    dbg("    Updating cp to handler (" + this.interrupts[Id].toString(16) + ")");
    this.regs[r_cp] = this.interrupts[Id];
};

var compiled = compile(code);
var vm = new VSVM(compiled);

if(1) do {
    vm.cycle();
} while (!vm.halt && !vm.int_scheduled);
