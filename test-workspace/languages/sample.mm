// Archivo de prueba del tema: Objective-C++.
#import <Foundation/Foundation.h>
#include <vector>
#include <string>

namespace bureau {
struct Sector {
    std::string name;
    int floor;
};
}

@interface FBCMap : NSObject
- (void)addSector:(const bureau::Sector &)sector;
- (NSUInteger)count;
@end

@implementation FBCMap {
    std::vector<bureau::Sector> _sectors;
}

- (void)addSector:(const bureau::Sector &)sector {
    _sectors.push_back(sector);
}

- (NSUInteger)count {
    return static_cast<NSUInteger>(_sectors.size());
}

@end

int main() {
    @autoreleasepool {
        FBCMap *map = [FBCMap new];
        [map addSector:{"Research", -3}];
        NSLog(@"Sectores: %lu", (unsigned long)[map count]);
    }
    return 0;
}
