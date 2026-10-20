% Archivo de prueba del tema: MATLAB.
function results = registry(items, threshold)
%REGISTRY Devuelve los Objetos de Poder que superan el umbral.
    arguments
        items struct
        threshold (1,1) double = 2
    end
    MAX_RESONANCE = 1e3;
    results = strings(0);
    for k = 1:numel(items)
        item = items(k);
        if item.threat > threshold && item.resonance <= MAX_RESONANCE
            results(end + 1) = sprintf("%s [%d]", item.code, item.threat); %#ok<AGROW>
        elseif isempty(item.code)
            continue
        end
    end
    disp(['Total: ', num2str(numel(results))]);
end
