// Archivo de prueba del tema: Objective-C.
#import <Foundation/Foundation.h>

typedef NS_ENUM(NSInteger, FBCThreat) {
    FBCThreatLow = 1,
    FBCThreatHigh = 2,
};

/// Un agente de campo de la Agencia.
@interface FBCAgent : NSObject
@property (nonatomic, copy) NSString *name;
@property (nonatomic, assign) NSInteger clearance;
- (instancetype)initWithName:(NSString *)name clearance:(NSInteger)clearance;
- (NSString *)badge;
@end

@implementation FBCAgent

- (instancetype)initWithName:(NSString *)name clearance:(NSInteger)clearance {
    if ((self = [super init])) {
        _name = [name copy];
        _clearance = clearance;
    }
    return self;
}

- (NSString *)badge {
    return [NSString stringWithFormat:@"%@ — level %ld", self.name, (long)self.clearance];
}

@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        FBCAgent *jesse = [[FBCAgent alloc] initWithName:@"Jesse Faden" clearance:7];
        NSArray<NSNumber *> *levels = @[@1, @2, @3];
        NSLog(@"%@ %lu %@", [jesse badge], (unsigned long)levels.count, YES ? @"Director" : nil);
    }
    return 0;
}
