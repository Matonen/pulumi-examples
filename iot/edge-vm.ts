import {
  StorageAccountTypes,
  VirtualMachineExtension,
  VirtualMachineSizeTypes,
} from "@pulumi/azure-nextgen/compute/latest";
import * as pulumi from "@pulumi/pulumi";
import {
  PublicIPAddress,
  NetworkInterface,
  Subnet,
} from "@pulumi/azure-nextgen/network/latest";
import { VirtualMachine } from "@pulumi/azure-nextgen/compute/latest";
import * as random from "@pulumi/random";

export class IotEdgeVM {
  readonly iotEdgeVmPublicIPAddress: PublicIPAddress;
  readonly iotEdgeVMAdminPassword: random.RandomPassword;

  constructor(
    env: string,
    commonArgs: any,
    subnet: Subnet,
    randomId: pulumi.Output<string>
  ) {
    const config = new pulumi.Config();
    this.iotEdgeVmPublicIPAddress = new PublicIPAddress("iot-edge-vm", {
      ...commonArgs,
      dnsSettings: {
        domainNameLabel: pulumi.interpolate`iot-edge-vm-${randomId}`,
      },
      publicIpAddressName: "pip-iot-edge-vm",
    });

    const iotEdgeVmNIC = new NetworkInterface("nic-iot-edge-vm", {
      ...commonArgs,
      networkInterfaceName: "nic-iot-edge-vm",
      ipConfigurations: [
        {
          name: "ipconfig1",
          subnet: {
            id: subnet.id,
          },
          publicIPAddress: {
            id: this.iotEdgeVmPublicIPAddress.id,
          },
        },
      ],
    });

    this.iotEdgeVMAdminPassword = new random.RandomPassword(
      "iotEdgeVMAdminPassword",
      {
        length: 16,
        overrideSpecial: "_%@",
        special: true,
      }
    );

    const iotEdgeVM = new VirtualMachine(`vm-iot-edge-${env}`, {
      ...commonArgs,
      vmName: `vm-iot-edge-${env}`,
      hardwareProfile: {
        vmSize: VirtualMachineSizeTypes.Standard_B1s,
      },
      networkProfile: {
        networkInterfaces: [
          {
            id: iotEdgeVmNIC.id,
            primary: true,
          },
        ],
      },
      osProfile: {
        adminUsername: config.require("edgeVM.adminUsername"),
        adminPassword: this.iotEdgeVMAdminPassword.result,
        computerName: "iotEdge",
        linuxConfiguration: {
          provisionVMAgent: true,
        },
      },
      storageProfile: {
        imageReference: {
          offer: "UbuntuServer",
          publisher: "Canonical",
          sku: "18.04-LTS",
          version: "latest",
        },
        osDisk: {
          caching: "ReadWrite",
          createOption: "FromImage",
          managedDisk: {
            storageAccountType: StorageAccountTypes.Standard_LRS,
          },
          diskSizeGB: 30,
          name: "osdisk",
        },
      },
    });

    // https://docs.microsoft.com/en-us/azure/iot-edge/how-to-install-iot-edge?view=iotedge-2018-06
    new VirtualMachineExtension(
      "InstallIoTEdgeRuntime",
      {
        ...commonArgs,
        publisher: "Microsoft.Azure.Extensions",
        type: "CustomScript",
        typeHandlerVersion: "2.1",
        autoUpgradeMinorVersion: true,
        vmExtensionName: "InstallIoTEdgeRuntime",
        vmName: iotEdgeVM.name,
        settings: {
          commandToExecute: `curl https://packages.microsoft.com/config/ubuntu/18.04/multiarch/prod.list > ./microsoft-prod.list && 
            sudo cp ./microsoft-prod.list /etc/apt/sources.list.d/ && 
            curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg && 
            sudo cp ./microsoft.gpg /etc/apt/trusted.gpg.d/ && 
            sudo apt-get update && 
            sudo apt-get -y install moby-engine &&
            sudo apt-get -y install iotedge`,
        },
      },
      { dependsOn: iotEdgeVM }
    );
  }
}
