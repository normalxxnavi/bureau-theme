// Archivo de prueba del tema: Zig.
const std = @import("std");

/// Nivel de amenaza de un Objeto de Poder.
const Threat = enum(u8) { low = 1, high = 2 };

const ContainError = error{Breach};

const ObjectOfPower = struct {
    code: []const u8,
    threat: Threat = .low,
    resonance: f64 = 0.0,

    pub const max_resonance: f64 = 1.0e3;

    pub fn contain(self: *ObjectOfPower) ContainError!void {
        if (self.resonance > max_resonance) return error.Breach;
        self.resonance = 0;
    }
};

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    var items = [_]ObjectOfPower{
        .{ .code = "OOP-0001", .threat = .high, .resonance = 12.5 },
        .{ .code = "AI-0042" },
    };
    for (&items, 0..) |*item, i| {
        if (item.threat != .high) continue;
        item.contain() catch |err| {
            try stdout.print("{s}: {}\n", .{ item.code, err });
            continue;
        };
        try stdout.print("{d} {s} contenido\n", .{ i, item.code });
    }
    defer std.debug.print("<<THE BOARD OBSERVES.>>\n", .{});
}

test "contención" {
    var item = ObjectOfPower{ .code = "OOP-0001" };
    try item.contain();
    try std.testing.expectEqual(@as(f64, 0), item.resonance);
}
