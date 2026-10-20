# Archivo de prueba del tema: Makefile.
SECTOR ?= research
CC := gcc
CFLAGS = -O2 -Wall -DSECTOR=\"$(SECTOR)\"
SOURCES := $(wildcard src/*.c)
OBJECTS := $(SOURCES:.c=.o)

.PHONY: all clean contain

all: bureau

bureau: $(OBJECTS)
	$(CC) $(CFLAGS) -o $@ $^

%.o: %.c
	@echo "Compilando $<"
	$(CC) $(CFLAGS) -c $< -o $@

contain:
ifeq ($(SECTOR),research)
	@echo "Sector de investigación"
else
	@echo "Otro sector: $(SECTOR)"
endif

clean:
	rm -f $(OBJECTS) bureau
