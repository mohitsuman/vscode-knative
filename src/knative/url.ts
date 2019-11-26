/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { window, QuickPickItem, commands, Uri } from 'vscode';
import { V1ServicePort } from '@kubernetes/client-node';
import { KnativeItem } from './knativeItem';
import { Progress } from "../util/progress";
import { ChildProcess } from 'child_process';
import { KnAPI } from '../kn/kn-api';
import { KnativeTreeObject } from '../kn/knativeTreeObject';

export class Url extends KnativeItem{

    static async create(context: KnativeTreeObject): Promise<string> {
        const component = await Url.getKnativeCmdData(context,
            'Select a Project to create a URL',
            'Select an Application to create a URL',
            'Select a Component you want to create a URL for');
        if (component) {
            const urlName = await Url.getName('URL name', await Url.kn.getRoutes(component));
            if (!urlName) { return null; }
            const ports: V1ServicePort[] = await Url.kn.getComponentPorts(component);
            const portItems: QuickPickItem[] = ports.map((item: any) => {
                item['label'] = `${item.port}/${item.protocol}`;
                return item;
            });
            let port: V1ServicePort | QuickPickItem;
            if (ports.length === 1) {
                port = ports[0];
            } else if (ports.length > 1) {
                port = await window.showQuickPick(portItems, {placeHolder: "Select port to expose"});
            } else {
                return Promise.reject(`Component '${component.getName()}' has no ports declared.`);
            }

            if (port) {
                return Progress.execFunctionWithProgress(`Creating a URL '${urlName}' for the Component '${component.getName()}'`,
                    () => Url.kn.createComponentCustomUrl(component, `${urlName}`, `${port['port']}`)
                        .then(() => `URL '${urlName}' for component '${component.getName()}' successfully created`)
                        .catch((err) => Promise.reject(`Failed to create URL '${urlName}' for component '${component.getName()}'. ${err.message}`))
                );
            }
        }
        return null;
    }

    static async del(treeItem: KnativeTreeObject): Promise<string> {
        let url = treeItem;
        const component = await Url.getKnativeCmdData(url,
            "From which Project you want to delete URL",
            "From which Application you want to delete URL",
            "From which Component you want to delete URL");
        if (!url && component) {
            url = await window.showQuickPick(Url.kn.getRoutes(component), {placeHolder: `Select the URL to delete from the component ${component.getName()}`});
        }
        if (url) {
            const value = await window.showWarningMessage(`Do you want to delete URL '${url.getName()}' from Component '${url.getParent().getName()}'?`, 'Yes', 'Cancel');
            if (value === 'Yes') {
                return Progress.execFunctionWithProgress(`Deleting URL ${url.getName()} from Component ${component.getName()}`, () => Url.kn.deleteURL(url))
                    .then(() => `URL '${url.getName()}' from Component '${url.getParent().getName()}' successfully deleted`)
                    .catch((err) => Promise.reject(`Failed to delete URL with error '${err}'`));
            }
        }
        return null;
    }

    static async open(treeItem: KnativeTreeObject): Promise<ChildProcess> {
        const component = treeItem.getParent();
        const urlDetails = await Url.kn.execute(KnAPI.getComponentUrl(), component.contextPath.fsPath);
        let urlObject: any;
        let result: any[];
        try {
            result = JSON.parse(urlDetails.stdout).items;
        } catch (ignore) {
            // in case of incorrect json output, ignore an error
        }
        if (result && result.length > 0) {
            urlObject = result.filter((value) => (value.metadata.name === treeItem.getName()));
        }
        if (urlObject[0].status.state === 'Pushed') {
            return commands.executeCommand('vscode.open', Uri.parse(`${urlObject[0].spec.protocol}://${urlObject[0].spec.host}`));
        } else {
            window.showInformationMessage('Selected URL is not created in cluster. Use \'Push\' command before opening URL in browser.');
        }
        return null;
    }
}