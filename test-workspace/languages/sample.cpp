// Archivo de prueba del tema: C++.
#include <iostream>
#include <memory>
#include <string>
#include <vector>

namespace fbc::research {

/// Nivel de amenaza de un Objeto Alterado.
enum class Threat : int { Low = 1, High = 2, Hiss = 9 };

template <typename T>
concept Numeric = std::is_arithmetic_v<T>;

class AlteredItem {
public:
    explicit AlteredItem(std::string code, Threat threat) : code_{std::move(code)}, threat_{threat} {}
    virtual ~AlteredItem() = default;

    [[nodiscard]] virtual std::string describe() const { return code_ + " (" + std::to_string(static_cast<int>(threat_)) + ")"; }
    bool operator==(const AlteredItem &other) const noexcept { return code_ == other.code_; }

protected:
    std::string code_;
    Threat threat_;
};

template <Numeric T>
constexpr T average(const std::vector<T> &values) {
    T sum{};
    for (const auto &v : values) sum += v;
    return values.empty() ? T{} : sum / static_cast<T>(values.size());
}

} // namespace fbc::research

int main() {
    using namespace fbc::research;
    auto duck = std::make_unique<AlteredItem>("AI-0042", Threat::Low);
    const auto mean = average<double>({0.25, 0.5, 1e-3});
    std::cout << duck->describe() << '\n' << R"(raw "string")" << mean << std::endl;
    return 0;
}
