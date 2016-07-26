
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
ops.out = o_out;
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
ops.iint=  o_iint;
ops.int =  o_int;
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

var symbols = {
	ops: ops,
	regs: regs,
};

exports.getSymbols = () => symbols;
exports.setSymbol = (Name, Symbols) => { symbols[Name] = Symbols; };
