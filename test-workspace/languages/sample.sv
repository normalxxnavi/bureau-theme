// Archivo de prueba del tema: SystemVerilog.
`timescale 1ns / 1ps
`define MAX_RESONANCE 16'd1000

module containment #(parameter int WIDTH = 16) (
    input  logic             clk,
    input  logic             rst_n,
    input  logic [WIDTH-1:0] resonance,
    output logic             breach
);
    typedef enum logic [1:0] { SEALED, WATCH, BREACH } state_t;
    state_t state;

    always_ff @(posedge clk or negedge rst_n) begin
        if (!rst_n) state <= SEALED;
        else if (resonance > `MAX_RESONANCE) state <= BREACH;
        else state <= WATCH;
    end

    assign breach = (state == BREACH);

    // Comprueba que una brecha no se cierra sola.
    property no_self_seal;
        @(posedge clk) state == BREACH |=> state != SEALED;
    endproperty
endmodule
