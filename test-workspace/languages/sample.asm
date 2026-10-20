; Archivo de prueba del tema: ensamblador x86-64 (NASM).
%define MAX_RESONANCE 1000

section .data
    code    db "OOP-0001", 10, 0
    len     equ $ - code

section .bss
    buffer  resb 64

section .text
    global _start

_start:
    mov     rax, [resonance]        ; carga la resonancia
    cmp     rax, MAX_RESONANCE
    jg      .breach
    xor     rax, rax
    mov     [resonance], rax
    jmp     .done
.breach:
    mov     rax, 1                  ; sys_write
    mov     rdi, 1
    lea     rsi, [rel code]
    mov     rdx, len
    syscall
.done:
    mov     rax, 60                 ; sys_exit
    xor     rdi, rdi
    syscall

resonance: dq 0x0C
