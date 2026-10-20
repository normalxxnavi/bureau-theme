// Archivo de prueba del tema: Bicep.
@description('Sector de la Casa Inmemorial')
@allowed([
  'research'
  'containment'
])
param sector string = 'research'

param location string = resourceGroup().location
var storageName = 'fbc${uniqueString(resourceGroup().id)}'

resource archive 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  tags: {
    sector: sector
    classified: true
  }
}

output archiveId string = archive.id
