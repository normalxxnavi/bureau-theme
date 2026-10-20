// Archivo de prueba del tema: CUDA C++.
#include <cuda_runtime.h>
#include <cstdio>

constexpr int THREADS = 256;

/** Mide la resonancia de cada muestra del Patterning. */
__global__ void resonance(const float *__restrict__ in, float *out, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) {
        out[i] = __sinf(in[i]) * 0.5f + 1.0e-2f;
    }
}

__device__ inline float clamp01(float v) { return fminf(fmaxf(v, 0.0f), 1.0f); }

int main() {
    const int n = 1 << 20;
    float *d_in = nullptr, *d_out = nullptr;
    cudaMalloc(&d_in, n * sizeof(float));
    cudaMalloc(&d_out, n * sizeof(float));
    resonance<<<(n + THREADS - 1) / THREADS, THREADS>>>(d_in, d_out, n);
    cudaError_t err = cudaDeviceSynchronize();
    if (err != cudaSuccess) printf("CUDA error: %s\n", cudaGetErrorString(err));
    cudaFree(d_in);
    cudaFree(d_out);
    return 0;
}
