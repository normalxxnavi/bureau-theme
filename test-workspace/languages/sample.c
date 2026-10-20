/* Archivo de prueba del tema: C. */
#include <stdio.h>
#include <string.h>

#define MAX_AGENTS 64
#define CLEARANCE(level) ((level) * 2 + 1)

/** Un Objeto de Poder registrado por la Agencia. */
typedef struct {
    const char *code;
    unsigned int threat;
    double resonance;
} ObjectOfPower;

enum Sector { RESEARCH = 1, CONTAINMENT, MAINTENANCE };

static int count_threats(const ObjectOfPower *items, size_t len) {
    int total = 0;
    for (size_t i = 0; i < len; ++i) {
        if (items[i].threat > 3 && items[i].resonance >= 0.5) {
            total += CLEARANCE(items[i].threat);
        } else if (items[i].code == NULL) {
            continue;
        }
    }
    return total;
}

int main(int argc, char **argv) {
    ObjectOfPower hotline = { "OOP-0001", 5, 0.97 };
    char label[MAX_AGENTS];
    snprintf(label, sizeof label, "%s [%u]\n", hotline.code, hotline.threat);
    printf("Sector %d: %s\t%c\n", CONTAINMENT, label, 'H');
    goto done;
done:
    return count_threats(&hotline, 1) > 0 ? 0 : 1;
}
