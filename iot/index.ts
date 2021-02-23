import * as pulumi from "@pulumi/pulumi";
import * as azure_nextgen from "@pulumi/azure-nextgen";
import * as random from "@pulumi/random";

import { IotEdgeVM } from "./edge-vm";
import { FreeIotHub } from "./iot-hub";
import {
  NetworkSecurityGroup,
  SecurityRuleAccess,
  SecurityRuleDirection,
  SecurityRuleProtocol,
  Subnet,
} from "@pulumi/azure-nextgen/network/latest";

const env = pulumi.getStack();

const location = new pulumi.Config("azure").require("location");

const config = new pulumi.Config();

const randomResourceId = new random.RandomId("random-resource-id", {
  byteLength: 2,
});

const resourceGroup = new azure_nextgen.resources.latest.ResourceGroup(
  "rg-iot",
  {
    location,
    resourceGroupName: pulumi.interpolate`rg-iot-${randomResourceId.hex}-${env}`,
  }
);

const commonArgs = {
  location,
  resourceGroupName: resourceGroup.name,
};

const iotHubVNET = new azure_nextgen.network.latest.VirtualNetwork(
  "vnet-iot-hub",
  {
    ...commonArgs,
    virtualNetworkName: "vnet-iot-hub",
    addressSpace: {
      addressPrefixes: ["10.0.1.0/24"],
    },
  }
);

const iotHubSubnetNsg = new NetworkSecurityGroup("nsg-iot-hub", {
  ...commonArgs,
  networkSecurityGroupName: "nsg-iot-hub",
  securityRules: [
    {
      name: "AllowSSH",
      direction: SecurityRuleDirection.Inbound,
      priority: 100,
      access: SecurityRuleAccess.Allow,
      protocol: SecurityRuleProtocol.Tcp,
      sourceAddressPrefix: "*",
      sourcePortRange: "*",
      destinationPortRange: "22",
      destinationAddressPrefix: "*",
    },
  ],
});

const iotEdgeSubnet = new Subnet("snet-iot-edge", {
  ...commonArgs,
  addressPrefix: "10.0.1.0/28",
  subnetName: "snet-iot-edge",
  virtualNetworkName: iotHubVNET.name,
  networkSecurityGroup: {
    id: iotHubSubnetNsg.id,
  },
});

new FreeIotHub(env, commonArgs, randomResourceId.hex);
const iotEdgeVM = new IotEdgeVM(
  env,
  commonArgs,
  iotEdgeSubnet,
  randomResourceId.hex
);

export const iotEdgeVMAdminUsername = config.require("edgeVM.adminUsername");
export const iotEdgeVMAdminPassword = iotEdgeVM.iotEdgeVMAdminPassword.result;
export const iotEdgeVmPAddress = iotEdgeVM.iotEdgeVmPublicIPAddress.ipAddress;

export const iotEdgeVmFQDN = iotEdgeVM.iotEdgeVmPublicIPAddress.dnsSettings.apply(
  (x) => x?.fqdn
);
