/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function pullImage(context: IActionContext, node?: ImageTreeItem, nodes?: ImageTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, suppressCreatePick: true, noItemFoundErrorMessage: localize('vscode-docker.commands.images.pull.noImages', 'No images are available to pull') },
        ext.imagesTree,
        ImageTreeItem.contextValue,
        node,
        nodes
    );

    let noneTagWarningShown = false;

    const taskCRF = new TaskCommandRunnerFactory(
        {
            taskName: localize('vscode-docker.commands.images.pull.terminalTitle', 'Pull images')
        }
    );

    for (const n of nodes) {
        // Images with <none> as a tag (i.e. they don't have a tag) can't be pulled so skip them
        if (/:<none>/i.test(n.fullTag)) {
            // Warn only once
            if (!noneTagWarningShown) {
                void context.ui.showWarningMessage(localize('vscode-docker.commands.images.pull.noneTag', 'Images without tags will be skipped.'));
                noneTagWarningShown = true;
            }

            continue;
        }

        await taskCRF.getCommandRunner()(
            ext.containerClient.pullImage({ image: n.fullTag })
        );
    }
}
