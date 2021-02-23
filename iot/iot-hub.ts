import {
  IotHubResource,
  IotHubSku,
} from "@pulumi/azure-nextgen/devices/latest";
import * as pulumi from "@pulumi/pulumi";
export class FreeIotHub {
  readonly iotHub: IotHubResource;
  constructor(env: string, commonArgs: any, randomId: pulumi.Output<string>) {
    this.iotHub = new IotHubResource("iot", {
      ...commonArgs,
      resourceName: pulumi.interpolate`iot-demo-${randomId}-${env}`,
      sku: { capacity: 1, name: IotHubSku.F1 },
    });
  }
}
