/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ListImagesItem } from "@microsoft/container-runtimes";
import { AzExtParentTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { danglingImagesMementoKey } from "../../commands/images/showDanglingImages";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { OutdatedImageChecker } from "./imageChecker/OutdatedImageChecker";
import { ImageGroupTreeItem } from './ImageGroupTreeItem';
import { ImageProperty, getImagePropertyValue, imageProperties } from "./ImageProperties";
import { ImageTreeItem } from "./ImageTreeItem";

export interface DatedDockerImage extends ListImagesItem {
    outdated?: boolean;
}

export class ImagesTreeItem extends LocalRootTreeItemBase<DatedDockerImage, ImageProperty> {
    private readonly outdatedImageChecker: OutdatedImageChecker = new OutdatedImageChecker();

    public constructor(parent?: AzExtParentTreeItem) {
        super(parent);
        this.sortBySettingInfo.properties.push({
            property: 'Size',
            description: localize('vscode-docker.tree.images.sortBySize', 'Sort by image size')
        });
    }

    public treePrefix: string = 'images';
    public label: string = localize('vscode-docker.tree.images.label', 'Images');
    public configureExplorerTitle: string = localize('vscode-docker.tree.images.configure', 'Configure images explorer');

    public childType: LocalChildType<DatedDockerImage> = ImageTreeItem;
    public childGroupType: LocalChildGroupType<DatedDockerImage, ImageProperty> = ImageGroupTreeItem;

    public labelSettingInfo: ITreeSettingInfo<ImageProperty> = {
        properties: imageProperties,
        defaultProperty: 'Tag',
    };

    public descriptionSettingInfo: ITreeArraySettingInfo<ImageProperty> = {
        properties: imageProperties,
        defaultProperty: ['CreatedTime'],
    };

    public groupBySettingInfo: ITreeSettingInfo<ImageProperty | CommonGroupBy> = {
        // No grouping by size
        properties: [...imageProperties.filter(p => p.property !== 'Size'), groupByNoneProperty],
        defaultProperty: 'Repository',
    };

    public get childTypeLabel(): string {
        return this.groupBySetting === 'None' ? 'image' : 'image group';
    }

    public async getItems(context: IActionContext): Promise<DatedDockerImage[]> {
        // TODO: runtimes
        // if (await ext.runtimeManager.contextManager.isInCloudContext()) {
        //     throw new CommandNotSupportedError(localize('vscode-docker.tree.images.unsupported', 'Images cannot be listed in cloud contexts.'));
        // }

        const includeDangling = ext.context.globalState.get(danglingImagesMementoKey, false);

        const result = await ext.runWithDefaultShell(client =>
            client.listImages({ dangling: includeDangling })
        );
        this.outdatedImageChecker.markOutdatedImages(result);

        return result;
    }

    public getPropertyValue(item: ListImagesItem, property: ImageProperty): string {
        return getImagePropertyValue(item, property);
    }
}
