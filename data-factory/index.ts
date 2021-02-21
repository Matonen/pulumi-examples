import * as pulumi from "@pulumi/pulumi";
import * as azure_nextgen from "@pulumi/azure-nextgen";
import * as random from "@pulumi/random";
import { FactoryIdentityType } from "@pulumi/azure-nextgen/datafactory/latest";
import * as azure from "@pulumi/azure";

const env = pulumi.getStack();

const location = new pulumi.Config("azure").require("location");

const randomResourceId = new random.RandomId("random-resource-id", {
  byteLength: 2,
});

const resourceGroup = new azure_nextgen.resources.latest.ResourceGroup(
  "rg-adf",
  {
    location,
    resourceGroupName: pulumi.interpolate`rg-adf-${randomResourceId.hex}-${env}`,
  }
);

const factory = new azure_nextgen.datafactory.latest.Factory("adf", {
  factoryName: pulumi.interpolate`adf-${randomResourceId.hex}-${env}`,
  location,
  resourceGroupName: resourceGroup.name,
  identity: { type: FactoryIdentityType.SystemAssigned },
});

const storageAccount = new azure_nextgen.storage.latest.StorageAccount(
  "storageAccount",
  {
    accountName: pulumi.interpolate`st${randomResourceId.hex}${env}`,
    allowBlobPublicAccess: false,
    enableHttpsTrafficOnly: true,
    kind: "StorageV2",
    minimumTlsVersion: "TLS1_2",
    resourceGroupName: resourceGroup.name,
    sku: {
      name: "Standard_LRS",
    },
  }
);

const inputContainer = new azure_nextgen.storage.latest.BlobContainer(
  "input-container",
  {
    accountName: storageAccount.name,
    containerName: "input",
    resourceGroupName: resourceGroup.name,
  }
);

const outputContainer = new azure_nextgen.storage.latest.BlobContainer(
  "output-container",
  {
    accountName: storageAccount.name,
    containerName: "output",
    resourceGroupName: resourceGroup.name,
  }
);

// Export the primary key of the Storage Account
const storageAccountKeys = pulumi
  .all([resourceGroup.name, storageAccount.name])
  .apply(([resourceGroupName, accountName]) =>
    azure_nextgen.storage.latest.listStorageAccountKeys({
      resourceGroupName,
      accountName,
    })
  );
const primaryStorageKey = storageAccountKeys.keys[0].value;

const blobStorageLinkedService = new azure_nextgen.datafactory.latest.LinkedService(
  "blobStorage-linked-service",
  {
    factoryName: factory.name,
    linkedServiceName: "AzureBlobStorage",
    properties: {
      connectionString: {
        type: "SecureString",
        value: pulumi.interpolate`DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${primaryStorageKey}`,
      },
      type: "AzureStorage",
    },
    resourceGroupName: resourceGroup.name,
  }
);

const xmlFile = new azure_nextgen.datafactory.latest.Dataset("xml-file", {
  datasetName: "XmlFile",
  factoryName: factory.name,
  properties: {
    type: "Xml",
    linkedServiceName: {
      referenceName: blobStorageLinkedService.name,
      type: "LinkedServiceReference",
    },
    encodingName: "UTF-8",
    location: {
      type: "AzureBlobStorageLocation",
      container: inputContainer.name,
      fileName: "test.xml"
    }
  },
  resourceGroupName: resourceGroup.name,
});

const jsonFile = new azure_nextgen.datafactory.latest.Dataset("json-file", {
  datasetName: "JsonFile",
  factoryName: factory.name,
  properties: {
    type: "Json",
    linkedServiceName: {
      referenceName: blobStorageLinkedService.name,
      type: "LinkedServiceReference",
    },
    encodingName: "UTF-8",
    location: {
      type: "AzureBlobStorageLocation",
      container: outputContainer.name,
    }
  },
  resourceGroupName: resourceGroup.name,
});


new azure.datafactory.Pipeline("xml-to-json", {
  resourceGroupName: resourceGroup.name,
  dataFactoryName: factory.name,
  name: "XML to JSON",
  variables: {
    xmlFile: xmlFile.name,
    jsonFile: jsonFile.name,
},
  activitiesJson: 
  `
  [
    {
      "name": "Copy XML to JSON",
      "type": "Copy",
      "dependsOn": [],
      "policy": {
        "timeout": "7.00:00:00",
        "retry": 0,
        "retryIntervalInSeconds": 30,
        "secureOutput": false,
        "secureInput": false
      },
      "userProperties": [],
      "typeProperties": {
        "source": {
          "type": "JsonSource",
          "formatSettings": {
            "type": "JsonReadSettings"
          }
        },
        "sink": {
          "type": "JsonSink",
          "formatSettings": {
            "type": "JsonWriteSettings"
          }
        },
        "enableStaging": false
      },
      "inputs": [
        {
          "referenceName": "xmlFile",
          "type": "DatasetReference"
        }
      ],
      "outputs": [
        {
          "referenceName": "jsonFile",
          "type": "DatasetReference"
        }
      ]
    }
  ]  
  `
});

// Enable this when Copy type is allowed.
/*
new azure_nextgen.datafactory.latest.Pipeline("xml-to-json", {
  factoryName: factory.name,
  resourceGroupName: resourceGroup.name,
  pipelineName: "XML to JSON",
  activities: [
    {
      name: "Copy XML as JSON",
      type: "Execution",  // This should be Copy but types does not allow that
      enableStaging: false,
      source: {
        type: "XmlSource",
        formatSettings: {
          type: "XmlReadSettings",
          validationMode: "none",
          namespaces: true,
        },
      },
      sink: {
        type: "JsonSink",
        formatSettings: {
          type: "JsonWriteSettings",
        },
      },
      inputs: [
        {
          referenceName: xmlFile.name,
          type: "DatasetReference",
        },
      ],
      outputs: [
        {
          referenceName: jsonFile.name,
          type: "DatasetReference",
        },
      ],
    },
  ],
});
*/
