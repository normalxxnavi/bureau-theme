# Archivo de prueba del tema: CMake.
cmake_minimum_required(VERSION 3.25)
project(Bureau VERSION 0.6.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
option(BUREAU_TESTS "Compila los tests" ON)

add_library(registry STATIC src/registry.cpp src/hotline.cpp)
target_include_directories(registry PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_compile_definitions(registry PRIVATE MAX_RESONANCE=1000)

if(BUREAU_TESTS AND NOT CMAKE_CROSSCOMPILING)
  enable_testing()
  add_executable(registry_tests tests/main.cpp)
  target_link_libraries(registry_tests PRIVATE registry)
  add_test(NAME registry COMMAND registry_tests)
endif()

foreach(sector IN ITEMS research containment)
  message(STATUS "Sector: ${sector}")
endforeach()
